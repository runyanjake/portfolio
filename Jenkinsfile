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
                // .State.Status flips to "running" the instant the container
                // process is created -- before nginx has bound :80. Probing
                // the port from inside the container is what actually proves
                // readiness, and separates "app broken" from "edge broken"
                // when the smoke test later fails.
                sh '''
                    set -euo pipefail
                    ready=0
                    for i in $(seq 1 30); do
                        status=$(docker inspect -f '{{.State.Status}}' "${CONTAINER_NAME}" 2>/dev/null || echo "missing")
                        case "$status" in
                            exited|dead|removing)
                                echo "ERROR: container entered failed state: $status"
                                docker logs --tail 200 "${CONTAINER_NAME}" || true
                                exit 1
                                ;;
                            running)
                                # busybox wget ships in nginx:alpine already.
                                if docker exec "${CONTAINER_NAME}" \
                                       wget -q -O /dev/null http://127.0.0.1:80/ 2>/dev/null; then
                                    echo "${CONTAINER_NAME} is serving HTTP on :80 (attempt ${i})."
                                    ready=1
                                    break
                                fi
                                ;;
                        esac
                        echo "waiting for ${CONTAINER_NAME}... (${i}/30) status=${status}"
                        sleep 2
                    done
                    if [ "${ready}" != 1 ]; then
                        echo "ERROR: ${CONTAINER_NAME} did not serve HTTP within 60s"
                        docker logs --tail 200 "${CONTAINER_NAME}" || true
                        exit 1
                    fi
                '''
            }
        }

        stage('Smoke Test') {
            steps {
                // Single-shot curl made this stage a coin flip: Traefik's
                // docker provider re-registers the recreated container
                // asynchronously, so a request in that window can die mid
                // HTTP/2 stream (curl exit 16) even though the deploy is
                // fine. Retry with backoff, then assert real content --
                // "<html" alone also passes for an empty build.
                sh '''
                    set -euo pipefail
                    body=$(mktemp)
                    trap 'rm -f "${body}"' EXIT

                    attempts=10
                    delay=2
                    code=000
                    rc=0

                    for i in $(seq 1 "${attempts}"); do
                        code=$(curl -sS -L -o "${body}" -w '%{http_code}' \
                                   --connect-timeout 5 --max-time 15 \
                                   "${SITE_URL}") && rc=0 || rc=$?
                        if [ "${rc}" = 0 ] && [ "${code}" = "200" ]; then
                            echo "Reachable on attempt ${i}."
                            break
                        fi
                        echo "attempt ${i}/${attempts}: curl_exit=${rc} http_code=${code}; retrying in ${delay}s"
                        if [ "${i}" = "${attempts}" ]; then break; fi
                        sleep "${delay}"
                        delay=$(( delay * 2 ))
                        if [ "${delay}" -gt 30 ]; then delay=30; fi
                    done

                    if [ "${rc}" != 0 ]; then
                        echo "ERROR: could not reach ${SITE_URL} (curl exit ${rc}) after ${attempts} attempts"
                        echo "--- does the container serve locally? ---"
                        docker exec "${CONTAINER_NAME}" wget -q -S -O /dev/null http://127.0.0.1:80/ 2>&1 || true
                        echo "(container OK + edge failing => Traefik routing/TLS, not the app)"
                        exit 1
                    fi
                    if [ "${code}" != "200" ]; then
                        echo "ERROR: ${SITE_URL} returned HTTP ${code}"
                        exit 1
                    fi
                    grep -qi "<html" "${body}" \
                        || { echo "ERROR: response from ${SITE_URL} did not look like an HTML page"; exit 1; }

                    # Content assertion: an empty content dir still builds and
                    # still serves a valid homepage, so check a real listing.
                    posts=$(curl -sS -L --max-time 15 "${SITE_URL}/blog") \
                        || { echo "ERROR: could not fetch ${SITE_URL}/blog"; exit 1; }
                    echo "${posts}" | grep -q '/blog/' \
                        || { echo "ERROR: ${SITE_URL}/blog lists zero posts -- content missing from image"; exit 1; }

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
