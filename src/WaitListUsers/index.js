"use strict"

const {pg_execute} = require('./postgres_helper')
const {QUERY_GET_USERS} =require('./sql_helper')
const utils = require("./utils")
const INTERNAL_COMPANY = 'APPLE'


exports.handler = async (event) => {
  console.log(event);
  let response;
  const resource = event.resource;
  const method = event.httpMethod;

  if (resource === '/ioc/waitlist') {
    switch (method) {
      case 'GET':
        response = await getWaitListUsers(event);
        break;
      default: {
        response = {
          statusCode: 405,
          body: JSON.stringify({ message: 'Method Not Allowed', error: 'not allowed' }),
        };
      }
    }
  } else {
    response = {
      statusCode: 404,
      body: JSON.stringify({ message: 'Endpoint not found', error: 'not found' }),
    };
  }

  response.headers = {
    'Access-Control-Allow-Origin': '*',
  };
  return response;
};

async function getWaitListUsers(event){
    let response
    try{
        const userData = await pg_execute(QUERY_GET_USERS)
        const filteredusers = filterInternalEmails(userData.rows)
        if(filteredusers.length > 0){
            response = utils.formatResponseWithData(200,'Data Fetched successfully' ,data)
        }
        else{
            response = utils.formatResponse(204,'Success', 'No Data Found')
        }
    }
    catch(error){
        console.log('error', error);
        response =  utils.formatResponse(400, 'failed', error);
    }
    return response
}

function filterInternalEmails(data) {
  console.log("Filtering emails")
  const regex = new RegExp('(test)|(trial)|(noreply)');
    return data.filter((obj) => {
    const companyName = obj.companyName ? obj.companyName.toLowerCase() : '';
    return !regex.test(obj.email.toLowerCase()) && companyName !== INTERNAL_COMPANY;
  });
}