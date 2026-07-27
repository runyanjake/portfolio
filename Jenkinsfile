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
        SITE_URL         = 'https://jake2.runyan.dev'
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
                sh '''
                    set -euo pipefail
                    docker run --rm \
                        -v "${WORKSPACE}":/app \
                        -w /app \
                        "${NODE_IMAGE}" \
                        sh -c "npm ci --no-audit --no-fund && npm run check" \
                        || { echo "ERROR: lint/type-check failed"; exit 1; }
                '''
            }
        }

        stage('Teardown') {
            steps {
                sh '''
                    set -euo pipefail
                    docker compose -f "${COMPOSE_FILE}" down --remove-orphans \
                        || { echo "ERROR: failed to tear down previous deployment"; exit 1; }
                '''
            }
        }

        stage('Build & Deploy') {
            steps {
                sh '''
                    set -euo pipefail
                    docker compose -f "${COMPOSE_FILE}" build --pull \
                        || { echo "ERROR: image build failed"; exit 1; }
                    docker compose -f "${COMPOSE_FILE}" up -d \
                        || { echo "ERROR: deployment start failed"; exit 1; }
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -euo pipefail
                    for i in $(seq 1 30); do
                        status=$(docker inspect -f '{{.State.Status}}' "${CONTAINER_NAME}" 2>/dev/null || echo "missing")
                        case "$status" in
                            running)
                                echo "Container ${CONTAINER_NAME} is running."
                                exit 0
                                ;;
                            exited|dead|removing)
                                echo "ERROR: container entered failed state: $status"
                                docker logs --tail 200 "${CONTAINER_NAME}" || true
                                exit 1
                                ;;
                        esac
                        echo "waiting for ${CONTAINER_NAME}... (${i}/30) status=${status}"
                        sleep 2
                    done
                    echo "ERROR: ${CONTAINER_NAME} did not become ready within 60s"
                    exit 1
                '''
            }
        }

        stage('Smoke Test') {
            steps {
                sh '''
                    set -euo pipefail
                    body=$(mktemp)
                    trap "rm -f ${body}" EXIT
                    code=$(curl -sS -L -o "${body}" -w "%{http_code}" --max-time 15 "${SITE_URL}") \
                        || { echo "ERROR: could not reach ${SITE_URL}"; exit 1; }
                    if [ "${code}" != "200" ]; then
                        echo "ERROR: ${SITE_URL} returned HTTP ${code}"
                        exit 1
                    fi
                    grep -qi "<html" "${body}" \
                        || { echo "ERROR: response from ${SITE_URL} did not look like an HTML page"; exit 1; }
                    echo "Smoke test OK (HTTP ${code})."
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
