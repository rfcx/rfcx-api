pipeline {
    agent {
        label 'slave'
    }
    environment {
        APIHTTP="api"
        APIMQTT="api-mqtt"
        APIMEDIA="api-media"
        PHASE=branchToConfig(BRANCH_NAME)
        ECR="887044485231.dkr.ecr.eu-west-1.amazonaws.com"
    }

    stages {
        stage("Build") {
            when {
                 expression { BRANCH_NAME ==~ /(develop|staging|master)/ }
            }
            steps {
                slackSend (channel: "#${slackChannel}", color: '#FF9800', message: "*HTTP API*: Build started <${env.BUILD_URL}|#${env.BUILD_NUMBER}> commit ${env.GIT_COMMIT[0..6]} on ${env.BRANCH_NAME}")
                sh "aws ecr get-login --no-include-email --region eu-west-1 | bash"
                sh "docker build -f build/Dockerfile -t ${APIHTTP}_${PHASE}:${BUILD_NUMBER} ."
                sh "docker tag ${APIHTTP}_${PHASE}:${BUILD_NUMBER} ${ECR}/${APIHTTP}_${PHASE}:${BUILD_NUMBER}"
                sh "docker push ${ECR}/${APIHTTP}_${PHASE}:${BUILD_NUMBER}"
            }
            post {
                success {
                    slackSend (channel: "#${slackChannel}", color: '#3380C7', message: "*HTTP API*: Image built on build <${env.BUILD_URL}|#${env.BUILD_NUMBER}>")
                    slackSend (channel: "#${slackChannel}", color: '#3380C7', message: "*API MQTT*: Image built on build <${env.BUILD_URL}|#${env.BUILD_NUMBER}>")
                    slackSend (channel: "#${slackChannel}", color: '#3380C7', message: "*Media API*: Image built on build <${env.BUILD_URL}|#${env.BUILD_NUMBER}>")
                    echo 'Compile Stage Successful'
                }
                failure {
                    slackSend (channel: "#${slackChannel}", color: '#F44336', message: "*HTTP API*: Image build failed <${env.BUILD_URL}|#${env.BUILD_NUMBER}>")
                    slackSend (channel: "#${slackChannel}", color: '#F44336', message: "*API MQTT*: Image build failed <${env.BUILD_URL}|#${env.BUILD_NUMBER}>")
                    slackSend (channel: "#${slackChannel}", color: '#F44336', message: "*Media API*: Image build failed <${env.BUILD_URL}|#${env.BUILD_NUMBER}>")
                    echo 'Compile Stage Failed'
                }
            }
        }
        stage('Deploy') {
            when {
                 expression { BRANCH_NAME ==~ /(develop|staging)/ }
            }
            steps {
                sh "kubectl set image deployment ${APIHTTP} ${APIHTTP}=${ECR}/${APIHTTP}_${PHASE}:${BUILD_NUMBER} --namespace ${PHASE}"
                sh "kubectl set image deployment ${APIMQTT} ${APIMQTT}=${ECR}/${APIHTTP}_${PHASE}:${BUILD_NUMBER} --namespace ${PHASE}"
            }
        }
        stage('Verifying') {
            when {
                 expression { BRANCH_NAME ==~ /(develop|staging)/ }
            }
            steps {
            catchError {
            sh "kubectl rollout status deployment ${APIHTTP} --namespace ${PHASE}"
            slackSend (channel: "#${slackChannel}", color: '#4CAF50', message: "*HTTP API*: Deployment completed <${env.BUILD_URL}|#${env.BUILD_NUMBER}>")
            sh "kubectl rollout status deployment ${APIMQTT} --namespace ${PHASE}"
	        sh "docker system prune -af"
            slackSend (channel: "#${slackChannel}", color: '#4CAF50', message: "*API MQTT*: Deployment completed <${env.BUILD_URL}|#${env.BUILD_NUMBER}>")
            }
            }
        }

        stage('Deploy Production') {
            when {
                 expression { BRANCH_NAME ==~ /(master)/ }
            }
            steps {
                sh "kubectl set image deployment ${APIHTTP} ${APIHTTP}=${ECR}/${APIHTTP}_${PHASE}:${BUILD_NUMBER} --namespace ${PHASE}"
                sh "kubectl set image deployment api-rabbitmq api-rabbitmq=${ECR}/${APIHTTP}_${PHASE}:${BUILD_NUMBER} --namespace ${PHASE}"
                sh "kubectl set image deployment ${APIMEDIA} ${APIMEDIA}=${ECR}/${APIHTTP}_${PHASE}:${BUILD_NUMBER} --namespace ${PHASE}"
            }
        }
        stage('Verify Production') {
            when {
                 expression { BRANCH_NAME ==~ /(master)/ }
            }
            steps {
            catchError {
            sh "kubectl rollout status deployment ${APIHTTP} --namespace ${PHASE}"
            slackSend (channel: "#${slackChannel}", color: '#4CAF50', message: "*HTTP API*: Deployment completed <${env.BUILD_URL}|#${env.BUILD_NUMBER}>")
            sh "kubectl rollout status deployment ${APIMEDIA} --namespace ${PHASE}"
            slackSend (channel: "#${slackChannel}", color: '#4CAF50', message: "*API Media*: Deployment completed <${env.BUILD_URL}|#${env.BUILD_NUMBER}>")
            sh "kubectl rollout status deployment api-rabbitmq --namespace ${PHASE}"
            slackSend (channel: "#${slackChannel}", color: '#4CAF50', message: "*API MQTT*: Deployment completed <${env.BUILD_URL}|#${env.BUILD_NUMBER}>")
            sh "docker system prune -af"
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
