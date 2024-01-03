'use strict'

const {pg_execute} = require("./postgres_helper")
const {QUERY_GET_COMPANIES_DATA} = require("./sql_helper")
const utils = require("./utils")

exports.handler = async (event) => {
  console.log(event);
  let response;
  const resource = event.resource;
  const method = event.httpMethod;

  if (resource === '/adm/getdata') {
    switch (method) {
      case 'GET':
        response = await getComapanies(event);
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

async function getComapanies(event){
    let response 
    try{
        let data = await pg_execute(QUERY_GET_COMPANIES_DATA)
        if(data.rows.length > 0){
            response = utils.formatResponseWithData(200,'Success' , data)
        }
        else{
            response = utils.formatResponse(204,"Success" , "No Data Found")
        }
    }
    catch(error){
        console.log(error)
        response = utils.formatResponse(400, 'failed', error)
    }
    return response
}