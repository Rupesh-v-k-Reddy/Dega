const utils = {};


utils.formatResponse = (statusCode, status, log) => {
    let response = {
        statusCode: statusCode,
        body: JSON.stringify({
            "status": status,
            "log": log
        })
    };
    return response;
};

utils.formatResponseWithData = (statusCode, status, log, data) => {
    let response = {
        statusCode: statusCode,
        body: JSON.stringify({
            "status": status,
            "log": log,
            "data": data
        })
    };
    return response;
},




module.exports = utils;
