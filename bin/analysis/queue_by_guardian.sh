#!/usr/bin/env bash


export SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";

export API_USER=$1;
export API_TOKEN=$2;
export MODEL_GUID=$3;
export GUARDIAN_GUID=$4;

export YYYY=$5;
export MM=$6;

for d in $(cal $MM $YYYY | grep "^ *[0-9]"); do 

  DD=$(printf "%02d" $d); 
  DATE_DAY="$YYYY-$MM-$DD";

  TIME_AM="T00:00:00.000Z";
  TIME_NOON="T12:00:00.000Z";
  TIME_PM="T23:59:59.999Z";

  echo "$DATE_DAY - AM";
  # SET_QUEUE_AM=`
  curl -s -X POST -H "x-auth-user: user/$API_USER" -H "x-auth-token: $API_TOKEN" -H "Content-Type: application/json" -H "Cache-Control: no-cache" "https://api.rfcx.org/v1/guardians/$GUARDIAN_GUID/audio/analysis?ending_before=$DATE_DAY$TIME_NOON&starting_after=$DATE_DAY$TIME_AM&model_id=$MODEL_GUID";
  # `;  
  # sleep 0.25;

  # echo "$DATE_DAY - PM";
  # SET_QUEUE_PM=`curl -s -X POST -H "x-auth-user: user/$API_USER" -H "x-auth-token: $API_TOKEN" -H "Content-Type: application/json" -H "Cache-Control: no-cache" "https://api.rfcx.org/v1/guardians/$GUARDIAN_GUID/audio/analysis?ending_before=$DATE_DAY$TIME_PM&starting_after=$DATE_DAY$TIME_NOON&model_id=$MODEL_GUID";`;  
  # sleep 0.25;

done

