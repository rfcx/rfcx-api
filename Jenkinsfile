#!/usr/bin/env groovy


env.DOCKER_REGISTRY           = 'gcr.io'
env.DOCKER_REGISTRY_PROJECT   = 'prj-p-gke-01-59b8'
env.BASE_DOCKER_IMAGE_NAME    = 'api_base'
env.API_DOCKER_IMAGE_NAME     = 'api_service'
env.MQTT_CLIENT_IMAGE_NAME    = 'api_mqtt_client'
env.APP_VERSION               = '1.0.0'

//****************************************//
//             PIPELINE BEGINS            //
//****************************************//

podTemplate(yaml: """
kind: Pod
metadata:
  annotations:
    com.cloudbees.sidecar-injector/inject: no
spec:
  serviceAccountName: kaniko-googleregistry
  containers:
  - name: hadolint
    image: hadolint/hadolint:latest-debian
    imagePullPolicy: Always
    command:
    - cat
    tty: true
  - name: shellcheck
    image: koalaman/shellcheck-alpine
    imagePullPolicy: Always
    command:
    - cat
    tty: true
  - name: kaniko-api
    image: gcr.io/kaniko-project/executor:debug
    imagePullPolicy: Always
    command:
    - /busybox/cat
    tty: true
  - name: kaniko-base
    image: gcr.io/kaniko-project/executor:debug
    imagePullPolicy: Always
    command:
    - /busybox/cat
    tty: true

"""
  ) {

  node(POD_LABEL) {
    ansiColor('xterm') {
      stage('Source Checkout') {
        checkout scm
        gitCommit = sh(returnStdout: true, script: "git rev-parse HEAD").trim()
        shortCommit = sh(returnStdout: true, script: "git log -n 1 --pretty=format:'%h'").trim()
        //branchName = sh(returnStdout: true, script: "git rev-parse --abbrev-ref HEAD").trim()
        gitBranchPath=sh(returnStdout: true, script: "git name-rev --name-only HEAD").trim()
        gitBranchName=gitBranchPath.split('remotes/origin/')[1]
        commitChangeset = sh(returnStdout: true, script: 'git diff-tree --no-commit-id --name-status -r HEAD').trim()
        commitMessage = sh(returnStdout: true, script: "git show ${gitCommit} --format=%B --name-status").trim()
        //appVersion = readFile("${env.WORKSPACE}/VERSION").trim()
        baseimagenonIgnoredChangeset = sh(returnStdout: true, script: "echo ${commitChangeset} | grep \'Dockerfile_base\' || true").trim()
        nonIgnoredChangeset = sh(returnStdout: true, script: "echo ${commitChangeset} | grep -v \'sonar-project.properties\\|README.md\\|.hadolint' || true").trim()
        userIdCause = currentBuild.getBuildCauses('hudson.model.Cause$UserIdCause')

        env.GIT_COMMIT = "${gitCommit}"
        env.GIT_COMMIT_SHORT = "${shortCommit}"
        env.GIT_BRANCH_PATH ="${gitBranchPath}"
        env.GIT_BRANCH = "${gitBranchName}"
        //env.APP_VERSION = "${appVersion}"

        echo "\u27A1 GIT_BRANCH PATH: ${env.GIT_BRANCH_PATH}"
        echo "\u27A1 GIT_BRANCH: ${env.GIT_BRANCH}"
        echo "\u27A1 GIT_COMMIT: ${env.GIT_COMMIT}"
        echo "\u27A1 GIT_COMMIT_SHORT: ${env.GIT_COMMIT_SHORT}"
        echo "\u27A1 APP_VERSION: ${env.APP_VERSION}"
        echo "\u27A1 nonIgnoredChangeset: ${nonIgnoredChangeset}"
        echo "\u27A1 baseimagenonIgnoredChangeset: ${baseimagenonIgnoredChangeset}"
      }

      // If only ignored files are changed, end pipeline early
      echo "userIdCause: ${userIdCause}"
      if("${nonIgnoredChangeset}" == "" && userIdCause.size() == 0) {
        currentBuild.result = 'ABORTED'
        echo 'Aborting build: commits only contains changes to ignored files'
        return
      }


      // Set Phase Args based on Branch
      PHASE=''
      if(env.GIT_BRANCH == 'master') {
        env.PHASE = "production"
      }
      if(env.GIT_BRANCH == 'staging') {
        env.PHASE = "staging"
      }
      if(env.GIT_BRANCH == 'develop') {
        env.PHASE = "testing"
      }
      echo "\u27A1 PHASE: ${env.PHASE}"

      stage('Pre-Build Analysis') {
        try {
          container('hadolint') {
            sh 'hadolint build/Dockerfile_base --config build/.hadolint_base.yaml --format checkstyle > checkstyle-baseimage-hadolint.xml'
            sh 'hadolint build/Dockerfile --config build/.hadolint.yaml --format checkstyle > checkstyle-hadolint.xml'
            sh 'hadolint build/mqtt/Dockerfile_mosquitto --config build/mqtt/.hadolint_mqtt_client.yaml --format checkstyle > checkstyle-mqtt-client-hadolint.xml'

          }
          container('shellcheck') {
            echo "Shell check disabled"
            //sh 'find . -type f -name "*.sh" | xargs -r shellcheck --format checkstyle >> checkstyle-shellcheck.xml'
          }
        } finally {
          recordIssues enabledForFailure: true, aggregatingResults: true, tool: checkStyle(pattern: 'checkstyle-*.xml')
        }
      }


      stage('SonarQube (Static Code) Analysis') {
        def sonarHome = tool 'SonarQubeScanner'
        withSonarQubeEnv('Sonarqube') {
          sh "${sonarHome}/bin/sonar-scanner"
        }

        timeout(time: 10, unit: 'MINUTES') {
            waitForQualityGate abortPipeline: true
        }
      }

      stage('Build & Push API Base Image to Registry') {

        if (env.GIT_BRANCH == "master" || env.GIT_BRANCH == "develop") {
            //if("${baseimagenonIgnoredChangeset}" == "" && userIdCause.size() == 0) {


          env.BASE_DOCKER_IMAGE_TAG = "v${env.APP_VERSION}-${env.GIT_COMMIT_SHORT}"
          env.DOCKER_BASE_IMAGE_URL = "${env.DOCKER_REGISTRY}/${env.DOCKER_REGISTRY_PROJECT}/${env.BASE_DOCKER_IMAGE_NAME}_${env.PHASE}:${env.BASE_DOCKER_IMAGE_TAG}"
          env.DOCKER_BASE_IMAGE_URL_LATEST = "${env.DOCKER_REGISTRY}/${env.DOCKER_REGISTRY_PROJECT}/${env.BASE_DOCKER_IMAGE_NAME}_${env.PHASE}:latest"

          //echo "\u27A1 Image URL: ${env.DOCKER_IMAGE_URL}"

          container('kaniko-base') {
              sh """

              #!/busybox/sh
                /kaniko/docker-credential-gcr config --token-source='gcloud'
                /kaniko/docker-credential-gcr config --token-source="env, store"
                echo "https://gcr.io" | /kaniko/docker-credential-gcr get
                /kaniko/docker-credential-gcr configure-docker

                echo "Building API BASE Image "
                /kaniko/docker-credential-gcr configure-docker
                /kaniko/executor \
                  --dockerfile ${pwd()}/build/Dockerfile_base \
                  --context ${pwd()} \
                  --destination ${env.DOCKER_BASE_IMAGE_URL} \
                  --destination ${env.DOCKER_BASE_IMAGE_URL_LATEST} \
                  --cleanup
                """
          }
          echo "\u27A1 Built & pushed image: ${env.DOCKER_IMAGE_URL}"
          echo "Perform Security scan using Anchore"
          writeFile file: 'anchore_images_base', text: "${env.DOCKER_BASE_IMAGE_URL}"
          anchore bailOnFail: false, engineRetries: '600', name: 'anchore_images_base'
          //}
        }
        else {
           echo "\u27A1 Error: Docker image can be build on master or develop branches only "
        }

        def info = [:]
        //info.version = appVersion
        info.branch = "${env.GIT_BRANCH}"
        info.buildNumber = "${env.BUILD_NUMBER}"
        info.commit = "${env.GIT_COMMIT}"
        info.commitShort = "${env.GIT_COMMIT_SHORT}"
        info.dockerTag = "v${env.APP_VERSION}"
        info.dockerImage = "${env.BASE_DOCKER_IMAGE_NAME}"
        //info.buildUrl = "${env.BUILD_URL}"
        // Spinnaker default template for docker artifacts
        info.messageFormat = "DOCKER"
        info.image = "${env.DOCKER_BASE_IMAGE_URL}"

        info = readJSON text: groovy.json.JsonOutput.toJson(info)
        writeJSON file: 'baseimage_metadata.json', pretty: 4, json: info
        archiveArtifacts 'baseimage_metadata.json'

        sh 'cat ./baseimage_metadata.json'
      }


      stage('Build RFCX API Images') {
        if (env.GIT_BRANCH == "master" || env.GIT_BRANCH == "develop") {
          parallel APIServiceImage: {
            stage('Build & Push API Service Image to Registry') {
              env.DOCKER_IMAGE_TAG = "v${env.APP_VERSION}-${env.GIT_COMMIT_SHORT}"
              env.DOCKER_API_IMAGE_URL = "${env.DOCKER_REGISTRY}/${env.DOCKER_REGISTRY_PROJECT}/${env.API_DOCKER_IMAGE_NAME}_${env.PHASE}:${env.DOCKER_IMAGE_TAG}"
              env.DOCKER_API_IMAGE_URL_LATEST = "${env.DOCKER_REGISTRY}/${env.DOCKER_REGISTRY_PROJECT}/${env.API_DOCKER_IMAGE_NAME}_${env.PHASE}:latest"

                container('kaniko-base') {
                    sh """
                    #!/busybox/sh
                      /kaniko/docker-credential-gcr config --token-source='gcloud'
                      /kaniko/docker-credential-gcr config --token-source="env, store"
                      echo "https://gcr.io" | /kaniko/docker-credential-gcr get
                      /kaniko/docker-credential-gcr configure-docker

                      echo "Building MQTT Image "
                      /kaniko/docker-credential-gcr configure-docker
                      /kaniko/executor \
                        --dockerfile ${pwd()}/build/Dockerfile \
                        --context ${pwd()} \
                        --destination ${env.DOCKER_API_IMAGE_URL} \
                        --destination ${env.DOCKER_API_IMAGE_URL_LATEST} \
                        --cleanup
                      """
                      echo "\u27A1 Built & pushed image: ${env.DOCKER_API_IMAGE_URL}"
                }
                echo "Perform Security scan for API Services image using Anchore"
                writeFile file: 'anchore_image_api_service', text: "${env.DOCKER_API_IMAGE_URL}"
                anchore bailOnFail: false, engineRetries: '600', name: 'anchore_image_api_service'
      }

      },

      MQTTClientImage: {
      stage('Build & Push MQTT Client Image to Registry') {
          env.DOCKER_IMAGE_TAG = "v${env.APP_VERSION}-${env.GIT_COMMIT_SHORT}"
          env.DOCKER_MQTT_CLIENT_IMAGE_URL = "${env.DOCKER_REGISTRY}/${env.DOCKER_REGISTRY_PROJECT}/${env.MQTT_CLIENT_IMAGE_NAME}_${env.PHASE}:${env.DOCKER_IMAGE_TAG}"
          env.DOCKER_MQTT_CLIENT_IMAGE_URL_LATEST = "${env.DOCKER_REGISTRY}/${env.DOCKER_REGISTRY_PROJECT}/${env.MQTT_CLIENT_IMAGE_NAME}_${env.PHASE}:latest"


                container('kaniko-base') {
                    sh """
                    #!/busybox/sh
                      /kaniko/docker-credential-gcr config --token-source='gcloud'
                      /kaniko/docker-credential-gcr config --token-source="env, store"
                      echo "https://gcr.io" | /kaniko/docker-credential-gcr get
                      /kaniko/docker-credential-gcr configure-docker

                      echo "Building MQTT Client Image "
                        /kaniko/executor \
                          --dockerfile ${pwd()}/build/mqtt/Dockerfile_mosquitto \
                          --context ${pwd()} \
                          --destination ${env.DOCKER_MQTT_CLIENT_IMAGE_URL} \
                          --destination ${env.DOCKER_MQTT_CLIENT_IMAGE_URL_LATEST} \
                          --cleanup
                      """
                      echo "\u27A1 Built & pushed image: ${env.DOCKER_MQTT_CLIENT_IMAGE_URL}"

                }
                echo "Perform Security scan using Anchore"
                writeFile file: 'anchore_images_mqtt_client', text: "${env.DOCKER_MQTT_CLIENT_IMAGE_URL}"
                anchore bailOnFail: false, engineRetries: '600', name: 'anchore_images_mqtt_client'
       }
      }
      def info = [:]
      info.version = "${env.APP_VERSION }"
      info.branch = "${env.GIT_BRANCH}"
      info.buildNumber = "${env.BUILD_NUMBER}"
      info.commit = "${env.GIT_COMMIT}"
      info.commitShort = "${env.GIT_COMMIT_SHORT}"
      info.dockerTag = "v${env.APP_VERSION}"
      info.api_service_dockerImage = "${env.DOCKER_API_IMAGE_URL}"
      info.mqtt_client_dockerImage = "${env.MQTT_CLIENT_IMAGE_NAME}"

      //info.buildUrl = "${env.BUILD_URL}"
      // Spinnaker default template for docker artifacts
      info.messageFormat = "DOCKER"
      info.api_service_image_url = "${env.DOCKER_API_IMAGE_URL}"
      info.mqtt_client_image_url = "${env.DOCKER_MQTT_CLIENT_IMAGE_URL}"

      info = readJSON text: groovy.json.JsonOutput.toJson(info)
      writeJSON file: 'metadata_api_service.json', pretty: 4, json: info
      archiveArtifacts 'metadata_api_service.json'
      sh 'cat ./metadata_api_service.json'
      }
       else {
          echo "\u27A1 Error: Docker image can be build on master or develop branches only "
       }
      }
     }
    }
  }
