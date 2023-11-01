[Home](../README.md) | [Tasks](../tasks/README.md) | **[Build/Deployment](README.md)**

# Building and Deploying the API

## Development server on Kubernetes

### First time setup

1. Ensure you have Docker authenticated to AWS
   ```
   aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 887044485231.dkr.ecr.eu-west-1.amazonaws.com
   ```

2. Build the image
   ```
   docker build -t core-api -f build/Dockerfile .
   docker tag core-api 887044485231.dkr.ecr.eu-west-1.amazonaws.com/core-api:testing
   docker push 887044485231.dkr.ecr.eu-west-1.amazonaws.com/core-api:testing
   ```

3. Create the secrets file
   (TODO)

4. Deploy the API
   ```
   kubectl apply -f build/development
   ```

In case you want to run the app locally
   ```
   docker run -p 8080:8080 -it --rm core-api
   ```

### Update

1. Build the image
   ```
   docker build -t core-api -f build/Dockerfile .
   docker tag core-api 887044485231.dkr.ecr.eu-west-1.amazonaws.com/core-api:testing
   docker push 887044485231.dkr.ecr.eu-west-1.amazonaws.com/core-api:testing
   ```

2. Deploy to server
   ```
   kubectl apply -f build/development
   ```


### Seed the database

1. Open a terminal on the timescaledb deployment.

2. Start the db client: `psql -U postgres -h localhost`

3. Copy the sql from `bin/timescale/seed.sql` to execute it.

4. Ctrl-d to logout


### Add/edit environment variables

You have 2 options:
1. If it is not a secret (it is regular config) then it is part of the deployment yaml file (in build/k8s/...).
2. If it is a secret (e.g. API key) then it should be added to the secrets yaml (this requires a few steps including base 64 encoding the secret -- see below).

#### Regular configuration

These are non-secret environment variables (e.g. logging level, enabled features, public urls, etc).

Add/edit in the `env` section of the deployment yaml file. They will look like:

```yaml
   env:
   - name: NEW_RELIC_NO_CONFIG_FILE
      value: "true"
   - name: NEW_RELIC_APP_NAME
      value: "Core API"
   - name: NEW_RELIC_LOG_LEVEL
      value: "warn"
```

_TODO_ The changes will be made automatically when pushed to `staging`/`master` branches.

The changes can be applied manually by running `kubectl apply -f build/k8s/http --namespace staging` (assuming the placeholders in the yaml have been set -- see `[NAMESPACE]` and others).

#### Secrets

Assume you want to add `X_API_KEY=n0tTeLLiNg`.

First, find out where the deployment is getting its environment variables by looking at the build/k8s/http/http-api.yaml file for it's fromEnv property. This will tell you the name of the secrets file. (It's probably `api-secrets`)

Next, update the secret (this works for adding a new key or editing an existing key) being sure to specify the correct namespace:

```
kubectl patch secret api-secrets --namespace staging -p='{"stringData":{"X_API_KEY": "n0tTeLLiNg"}}' -v=1
```

Finally, restart the API(s):

```
kubectl rollout restart deployment/api --namespace staging
```

Note you might need to restart multiple APIs (replace `api` with the name of the deployment from the k8s yaml deployment file -- e.g. `api-mqtt`, `api-media`, etc).

## FAQs

### My latest deployment has crashed production. What should I do?

In an emergency, you can revert a deployment to a specific build like this (example for mqtt):
```sh
kubectl set image deployment api-mqtt-legacy api-mqtt-legacy=887044485231.dkr.ecr.eu-west-1.amazonaws.com/api-mqtt_production:192 --namespace production
```

The number `192` is the build number in Jenkins.

