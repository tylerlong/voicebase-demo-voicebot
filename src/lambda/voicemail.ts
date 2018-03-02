'use strict';

export function handleNew(event, context, callback) {
    const tokenKey = 'Validation-Token'
    let token = event.headers[tokenKey];
    if (token && !event.body) {
        let headers = {};
        headers[tokenKey] = token;
        callback(null, { statusCode: 200, headers })
        return
    }
    const response = {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Go Serverless v1.0! Your function executed successfully!',
            input: event,
        }),
    };

    callback(null, response);

    // Use this code if you don't use the http event with the LAMBDA-PROXY integration
    // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};
