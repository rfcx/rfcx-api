#!/usr/bin/env bash


export SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";

export API_USER=$1;
export API_TOKEN=$2;
export MODEL_GUID=$3;

export BY_GUARDIAN_OR_BY_SITE=$4
export GUARDIAN_OR_SITE_GUID=$5;

export YYYY=$6;
export MM=$7;

if [[ "$BY_GUARDIAN_OR_BY_SITE" == "guardian" ]]; then
  INNER_ENDPOINT_URL="guardians";
else
  INNER_ENDPOINT_URL="guardians/sites";
fi

export API_ENDPOINT="https://api.rfcx.org/v1/$INNER_ENDPOINT_URL/$GUARDIAN_OR_SITE_GUID/audio/analysis";
export WAIT_BETWEEN_REQUESTS=1;

for d in $(cal $MM $YYYY | grep "^ *[0-9]"); do 

  DD=$(printf "%02d" $d); 
  DATE_DAY="$YYYY-$MM-$DD";

  TIME_00="T00:00:00.000Z";
  TIME_06="T06:00:00.000Z";
  TIME_12="T12:00:00.000Z";
  TIME_18="T18:00:00.000Z";
  TIME_24="T23:59:59.999Z";

  SET_QUEUE_06=`curl -s -X POST -H "x-auth-user: user/$API_USER" -H "x-auth-token: $API_TOKEN" -H "Content-Type: application/json" -H "Cache-Control: no-cache" "$API_ENDPOINT?ending_before=$DATE_DAY$TIME_06&starting_after=$DATE_DAY$TIME_00&model_id=$MODEL_GUID";`; 
  echo "$DATE_DAY - 00:00 -> 06:00 — $SET_QUEUE_06"; 
  echo "waiting $WAIT_BETWEEN_REQUESTS second(s)...";
  sleep $WAIT_BETWEEN_REQUESTS;
  echo "launching next request...";

  SET_QUEUE_12=`curl -s -X POST -H "x-auth-user: user/$API_USER" -H "x-auth-token: $API_TOKEN" -H "Content-Type: application/json" -H "Cache-Control: no-cache" "$API_ENDPOINT?ending_before=$DATE_DAY$TIME_12&starting_after=$DATE_DAY$TIME_06&model_id=$MODEL_GUID";`; 
  echo "$DATE_DAY - 06:00 -> 12:00 — $SET_QUEUE_12";   
  echo "waiting $WAIT_BETWEEN_REQUESTS second(s)...";
  sleep $WAIT_BETWEEN_REQUESTS;
  echo "launching next request...";

  SET_QUEUE_18=`curl -s -X POST -H "x-auth-user: user/$API_USER" -H "x-auth-token: $API_TOKEN" -H "Content-Type: application/json" -H "Cache-Control: no-cache" "$API_ENDPOINT?ending_before=$DATE_DAY$TIME_18&starting_after=$DATE_DAY$TIME_12&model_id=$MODEL_GUID";`; 
  echo "$DATE_DAY - 12:00 -> 18:00 — $SET_QUEUE_18";  
  echo "waiting $WAIT_BETWEEN_REQUESTS second(s)...";
  sleep $WAIT_BETWEEN_REQUESTS;
  echo "launching next request...";

  SET_QUEUE_24=`curl -s -X POST -H "x-auth-user: user/$API_USER" -H "x-auth-token: $API_TOKEN" -H "Content-Type: application/json" -H "Cache-Control: no-cache" "$API_ENDPOINT?ending_before=$DATE_DAY$TIME_24&starting_after=$DATE_DAY$TIME_18&model_id=$MODEL_GUID";`; 
  echo "$DATE_DAY - 18:00 -> 24:00 — $SET_QUEUE_24"; 
  echo "waiting $WAIT_BETWEEN_REQUESTS second(s)...";
  sleep $WAIT_BETWEEN_REQUESTS;
  echo "launching next request...";



done

