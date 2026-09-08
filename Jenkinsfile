pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 20, unit: 'MINUTES')
    }

    environment {
        DISCORD_WEBHOOK  = credentials('discord-pws-builds-channel-webhook')
        COMPOSE_FILE     = 'docker-compose.prod.yml'
        CONTAINER_NAME   = 'jake-website'
        TRAEFIK_NETWORK  = 'traefik'
        NODE_IMAGE       = 'node:22-alpine'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Preflight') {
            steps {
                script {
                    if (!env.DISCORD_WEBHOOK?.trim()) {
                        error('Missing required credential: discord-pws-builds-channel-webhook')
                    }
                }
                sh '''
                    set -euo pipefail
                    command -v docker >/dev/null 2>&1 || { echo "ERROR: docker not installed on agent"; exit 1; }
                    docker compose version >/dev/null 2>&1 || { echo "ERROR: docker compose plugin unavailable"; exit 1; }
                    command -v curl >/dev/null 2>&1 || { echo "ERROR: curl not installed on agent"; exit 1; }
                    test -f "${COMPOSE_FILE}"  || { echo "ERROR: ${COMPOSE_FILE} not found"; exit 1; }
                    test -f Dockerfile         || { echo "ERROR: Dockerfile not found"; exit 1; }
                    test -f package.json       || { echo "ERROR: package.json not found"; exit 1; }
                    test -f nginx.conf         || { echo "ERROR: nginx.conf not found"; exit 1; }
                    docker compose -f "${COMPOSE_FILE}" config -q \
                        || { echo "ERROR: ${COMPOSE_FILE} is not valid"; exit 1; }
                    docker network inspect "${TRAEFIK_NETWORK}" >/dev/null 2>&1 \
                        || { echo "ERROR: external network '${TRAEFIK_NETWORK}' missing on this host"; exit 1; }
                '''
            }
        }

        stage('Lint & Type-check') {
            steps {
                // Runs inside a throwaway container so the agent needs no Node toolchain.
                // Stream the workspace in over stdin via tar rather than bind-mounting.
                // Bind mounts break here for two reasons: the job name "Jake Portfolio CI"
                // puts spaces in the workspace path, and Jenkins talks to the host Docker
                // daemon via a mounted socket -- the daemon resolves --mount source= on
                // the *host* filesystem, which does not match the Jenkins container's view
                // of the workspace, so /app ends up empty and `npm ci` cannot see the lock.
                sh '''
                    set -euo pipefail
                    test -f package-lock.json \
                        || { echo "ERROR: package-lock.json missing in workspace"; exit 1; }
                    tar -cf - \
                            --exclude=./node_modules \
                            --exclude=./dist \
                            --exclude=./.git \
                            . \
                        | docker run --rm -i \
                            -w /app \
                            "${NODE_IMAGE}" \
                            sh -c "tar -xf - && npm ci --no-audit --no-fund && npm run check" \
                        || { echo "ERROR: lint/type-check failed"; exit 1; }
                '''
            }
        }

        stage('Build & Deploy') {
            steps {
                // No separate teardown stage: `down` before `build` took the
                // site offline for the whole build and widened the window in
                // which Traefik has no backend registered for this host.
                // `up -d` recreates the container only once the new image
                // exists, so downtime is a container restart.
                sh '''
                    set -euo pipefail
                    docker compose -f "${COMPOSE_FILE}" build --pull \
                        || { echo "ERROR: image build failed"; exit 1; }
                    docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans \
                        || { echo "ERROR: deployment start failed"; exit 1; }
                '''
            }
        }

        stage('Health Check') {
            steps {
                // The deploy is healthy once the container answers on :80.
                // Probed from inside the container on purpose: the site's
                // public address is this host's OWN public IP, so a request
                // from the Jenkins container would have to hairpin out to the
                // router and back. That path is unreliable here and fails
                // even when the site is perfectly reachable from the
                // internet -- it produced red builds on green deploys.
                sh '''
                    set -euo pipefail
                    for i in $(seq 1 30); do
                        status=$(docker inspect -f '{{.State.Status}}' "${CONTAINER_NAME}" 2>/dev/null || echo missing)
                        case "${status}" in
                            exited|dead|removing)
                                echo "ERROR: container entered failed state: ${status}"
                                docker logs --tail 200 "${CONTAINER_NAME}" || true
                                exit 1
                                ;;
                        esac
                        # busybox wget ships in nginx:alpine already.
                        if docker exec "${CONTAINER_NAME}" \
                               wget -q -O /dev/null http://127.0.0.1:80/ 2>/dev/null; then
                            echo "${CONTAINER_NAME} healthy: serving HTTP on :80 (attempt ${i})."
                            exit 0
                        fi
                        echo "waiting for ${CONTAINER_NAME}... (${i}/30) status=${status}"
                        sleep 2
                    done
                    echo "ERROR: ${CONTAINER_NAME} did not serve HTTP within 60s"
                    docker logs --tail 200 "${CONTAINER_NAME}" || true
                    exit 1
                '''
            }
        }
    }

    post {
        always {
            script {
                def result = currentBuild.currentResult
                def emoji = ':yellow_circle:'
                if (result == 'SUCCESS') { emoji = ':green_circle:' }
                if (result == 'FAILURE') { emoji = ':red_circle:' }

                def branch = env.BRANCH_NAME?.trim() ?: (env.GIT_BRANCH ?: '').replaceFirst(/^origin\//, '')
                if (!branch?.trim()) { branch = 'Main/Manual' }

                def duration = (currentBuild.durationString ?: '')
                    .replace(' and no weeks', '')
                    .replace(' and counting', '')

                def commitLines = []
                currentBuild.changeSets?.each { cs ->
                    cs.items?.each { entry ->
                        commitLines << "> ${entry.msg} (by *${entry.author?.fullName ?: entry.author?.id ?: 'unknown'}*)"
                    }
                }
                def commits = commitLines ? commitLines.join('\n') : 'No recent changes detected.'

                def discordDescription = """**Status:** ${emoji} ${result}
**Branch:** `${branch}`
**Duration:** :stopwatch: ${duration}

**Commits:**
${commits}"""

                discordSend(
                    webhookURL: env.DISCORD_WEBHOOK,
                    title: "📦 Build Alert: ${env.JOB_NAME} [Build #${env.BUILD_NUMBER}]",
                    link: "${env.BUILD_URL}",
                    result: "${currentBuild.currentResult}",
                    description: discordDescription
                )
            }
        }
        failure {
            sh '''
                echo "===== docker ps -a ====="
                docker ps -a || true
                echo "===== docker compose ps ====="
                docker compose -f "${COMPOSE_FILE}" ps || true
                echo "===== ${CONTAINER_NAME} logs (last 200) ====="
                docker logs --tail 200 "${CONTAINER_NAME}" 2>&1 || true
            '''
        }
    }
}
