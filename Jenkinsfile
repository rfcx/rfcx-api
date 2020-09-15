pipeline {
    agent {
    kubernetes {
      yaml """
kind: Pod
metadata:
  name: kaniko
spec:
  containers:
  - name: kaniko
    image: gcr.io/kaniko-project/executor:debug
    imagePullPolicy: Always
    command:
    - cat
    tty: true
    volumeMounts:
      - name: docker-config
        mountPath: /kaniko/.docker
  volumes:
    - name: docker-config
      configMap:
        name: docker-config
"""
    }
  }
    environment {
        APIHTTP="api"
        APIMQTT="api-mqtt"
        APIMEDIA="api-media"
        PHASE=branchToConfig(BRANCH_NAME)
        ECR="887044485231.dkr.ecr.eu-west-1.amazonaws.com"
    }

    stages {
        stage("Build With Kaniko") {
            when {
                 expression { BRANCH_NAME ==~ /(develop|staging|master)/ }
            }
            steps {
                slackSend (channel: "#${slackChannel}", color: '#FF9800', message: "*HTTP API*: Build started <${env.BUILD_URL}|#${env.BUILD_NUMBER}> commit ${env.GIT_COMMIT[0..6]} branch ${env.BRANCH_NAME}")
                catchError {
                container(name: 'kaniko') {
                sh '''
                /kaniko/executor --snapshotMode=redo --use-new-run=true --cache=true --build-arg PHASE=${PHASE} --build-arg --cache-repo=${ECR}/${APIHTTP}/${PHASE} --dockerfile `pwd`/build/http/Dockerfile --context `pwd` --destination=${ECR}/${APIHTTP}/${PHASE}:latest --destination=${ECR}/${APIHTTP}/${PHASE}:${GIT_COMMIT} --destination=${ECR}/${APIHTTP}/${PHASE}:v$BUILD_NUMBER
                '''
                }
                }

                slackSend (channel: "#${slackChannel}", color: '#FF9800', message: "*MQTT API*: Build started <${env.BUILD_URL}|#${env.BUILD_NUMBER}> commit ${env.GIT_COMMIT[0..6]} branch ${env.BRANCH_NAME}")
                catchError {
                container(name: 'kaniko') {
                sh '''
                /kaniko/executor --snapshotMode=redo --use-new-run=true --cache=true --build-arg PHASE=${PHASE} --build-arg --cache-repo=${ECR}/${APIMQTT}/${PHASE} --dockerfile `pwd`/build/mqtt/Dockerfile --context `pwd` --destination=${ECR}/${APIMQTT}/${PHASE}:latest --destination=${ECR}/${APIMQTT}/${PHASE}:${GIT_COMMIT} --destination=${ECR}/${APIMQTT}/${PHASE}:v$BUILD_NUMBER
                '''
                }
                }


                slackSend (channel: "#${slackChannel}", color: '#FF9800', message: "*Media API*: Build started <${env.BUILD_URL}|#${env.BUILD_NUMBER}> commit ${env.GIT_COMMIT[0..6]} branch ${env.BRANCH_NAME}")
                catchError {
                container(name: 'kaniko') {
                sh '''
                /kaniko/executor --snapshotMode=redo --use-new-run=true --cache=true --build-arg PHASE=${PHASE} --build-arg --cache-repo=${ECR}/${APIMEDIA}/${PHASE} --dockerfile `pwd`/build/media/Dockerfile --context `pwd` --destination=${ECR}/${APIMEDIA}/${PHASE}:latest --destination=${ECR}/${APIMEDIA}/${PHASE}:${GIT_COMMIT} --destination=${ECR}/${APIMEDIA}/${PHASE}:v$BUILD_NUMBER
                '''
                }
                }

           post {
               success {
                   slackSend (channel: "#${slackChannel}", color: '#3380C7', message: "*API*: Image built on <${env.BUILD_URL}|#${env.BUILD_NUMBER}> branch ${env.BRANCH_NAME}")
                   echo 'Compile Stage Successful'
               }
               failure {
                   slackSend (channel: "#${slackChannel}", color: '#F44336', message: "*API*: Image build failed <${env.BUILD_URL}|#${env.BUILD_NUMBER}> branch ${env.BRANCH_NAME}")
                   echo 'Compile Stage Failed'
               }
           }
        }
        stage('Deploy') {
            agent {
                label 'slave'
            }
            options {
                skipDefaultCheckout true
            }
            when {
                 expression { BRANCH_NAME ==~ /(develop|staging|master)/ }
            }
            steps {
                sh "kubectl set image deployment ${APIHTTP} ${APIHTTP}=${ECR}/${APIHTTP}/${PHASE}:v$BUILD_NUMBER --namespace ${PHASE}"
                sh "kubectl set image deployment ${APIMQTT} ${APIMQTT}=${ECR}/${APIMQTT}/${PHASE}:v$BUILD_NUMBER --namespace ${PHASE}"
                sh "kubectl set image deployment ${APIMEDIA} ${APIMEDIA}=${ECR}/${APIMEDIA}/${PHASE}:v$BUILD_NUMBER --namespace ${PHASE}"
            }
        }
        stage('Verifying') {
            agent {
                label 'slave'
            }
            options {
                skipDefaultCheckout true
            }
            when {
                 expression { BRANCH_NAME ==~ /(develop|staging|master)/ }
            }
            steps {
            catchError {
            sh "kubectl rollout status deployment ${APIHTTP} --namespace ${PHASE}"
            sh "kubectl rollout status deployment ${APIMQTT} --namespace ${PHASE}"
            sh "kubectl rollout status deployment ${APIMEDIA} --namespace ${PHASE}"
            slackSend (channel: "#${slackChannel}", color: '#4CAF50', message: "*API*: Deployment completed <${env.BUILD_URL}|#${env.BUILD_NUMBER}> branch ${env.BRANCH_NAME}")
            }
            }
        }
    }
}

def branchToConfig(branch) {
     script {
        result = "NULL"
        if (branch == 'develop') {
             result = "testing"
             slackChannel = "alerts-deployment"
        }
        if (branch == 'staging') {
             result = "staging"
             slackChannel = "alerts-deployment"
        }
        if (branch == 'master') {
             result = "production"
             slackChannel = "alerts-deployment-prod"
        }
        echo "BRANCH:${branch} -> CONFIGURATION:${result}"
        }
         return result
}
