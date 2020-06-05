# Building and deploying the API

## Development server

### First time setup

0. Ensure you have Docker authenticated to AWS
   ```
   aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 887044485231.dkr.ecr.eu-west-1.amazonaws.com
   ```
   
1. Build the image (replace `2` with the next version) (or skip this step to use an existing image)
   ```
   docker build -t api_development -f build/http/Dockerfile .
   docker tag api_development 887044485231.dkr.ecr.eu-west-1.amazonaws.com/api_development:2
   docker push 887044485231.dkr.ecr.eu-west-1.amazonaws.com/api_development:2
   ```

2. Deploy the timescale db:
   ```
   kubectl apply -f build/timescaledb/development/deploy.yaml
   kubectl apply -f build/timescaledb/development/service.yaml
   ```

3. Create the secrets file:
   (TODO)

4. Deploy the API:
   ```
   kubectl apply -f build/http/development/deploy.yaml
   kubectl apply -f build/http/development/service.yaml
   kubectl apply -f build/http/development/ingress.yaml
   ```

### Update

1. Build the image (replace `2` with the next version)
   ```
   docker build -t api_development -f build/http/Dockerfile .
   docker tag api_development 887044485231.dkr.ecr.eu-west-1.amazonaws.com/api_development:2
   docker push 887044485231.dkr.ecr.eu-west-1.amazonaws.com/api_development:2
   ```

2. Deploy to server
   ```
   kubectl apply -f build/http/development/deploy.yaml
   ```


### Seed the database

1. Open a terminal on the timescaledb deployment.

2. Start the db client: `psql -U postgres -h localhost`

3. Copy the sql from `bin/timescale/seed.sql` to execute it.

4. Ctrl-d to logout
