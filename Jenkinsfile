pipeline {
    agent {
        label 'slave'
    }
    environment {
        APIHTTP="api"
        APIMQTT="api-mqtt"
        PHASE=branchToConfig(BRANCH_NAME)
        ECR="887044485231.dkr.ecr.eu-west-1.amazonaws.com"
    }
    stages {
        stage("Build") {
            when {
                 expression { BRANCH_NAME ==~ /(staging|master)/ }
            }
            steps {
            slackSend (color: '#FF9800', message: "STARTED: ${env.BUILD_NUMBER} Application ${APP} Branch ${PHASE} \nCommit ${GIT_COMMIT} by ${env.GIT_COMMITTER_NAME} (${env.BUILD_URL})")
            sh "aws ecr get-login --no-include-email --region eu-west-1 | bash"
            sh "docker build -t ${APP}_${PHASE}:${BUILD_NUMBER} ."
            sh "docker tag ${APP}_${PHASE}:${BUILD_NUMBER} ${ECR}/${APP}_${PHASE}:${BUILD_NUMBER}"
            sh "docker push ${ECR}/${APP}_${PHASE}:${BUILD_NUMBER}"
            sh "docker system prune -af"
            }
           post {
               success {
                   slackSend (color: '#3380C7', message: "Build Successful: Job ${APP} ${PHASE} [${env.BUILD_NUMBER}] ${GIT_COMMIT} (${env.BUILD_URL})")
                   echo 'Compile Stage Successful'
               }
               failure {
                   slackSend (color: '#F44336', message: "Build Failure: Job ${APP} ${PHASE} [${env.BUILD_NUMBER}] ${GIT_COMMIT} (${env.BUILD_URL})")
                   echo 'Compile Stage Failed'
               }
           }
        }
        stage('Deploy') {
            when {
                 expression { BRANCH_NAME ==~ /(staging|master)/ }
            }
            steps {
                sh "kubectl set image deployment ${APP} ${APP}=${ECR}/${APP}_${PHASE}:${BUILD_NUMBER} --namespace ${PHASE}"
            }
        }
        stage('Verifying') {
            when {
                 expression { BRANCH_NAME ==~ /(staging|master)/ }
            }
            steps {
            catchError {
            sh "kubectl rollout status deployment ${APP} --namespace ${PHASE}"
            slackSend (color: '#4CAF50', message: "Deployment Successful: Job ${APP} ${PHASE} [${env.BUILD_NUMBER}] ${GIT_COMMIT}' (${env.BUILD_URL})")
            }
            }
        }
    }
    post {
        success {
            echo 'whole pipeline successful'
                }
        unstable {
            echo 'pipeline failed, at least one step unstable'
            }
        failure {
            echo 'I failed :('
        }
    }
}
  def branchToConfig(branch) {
     script {
        result = "NULL"
        if (branch == 'staging') {
             result = "staging"
        withCredentials([file(credentialsId: 'api_staging_env', variable: 'PRIVATE_ENV')]) {
        sh "cp $PRIVATE_ENV rfcx.sh"
        sh "chmod 777 rfcx.sh"
        }
        }
        if (branch == 'master') {
             result = "production"
        withCredentials([file(credentialsId: 'api_production_env', variable: 'PRIVATE_ENV')]) {
        sh "cp $PRIVATE_ENV rfcx.sh"
        sh "chmod 777 rfcx.sh"
        }
         }
         echo "BRANCH:${branch} -> CONFIGURATION:${result}"
         }
         return result
     }
