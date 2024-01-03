'use strict'

module.exports = {
     QUERY_GET_USERS: `select u.id as "email" , c."name" as "companyName" from users u 
     join companies c on c.id =u."companyID"  where c."isExternal" = false`,
}