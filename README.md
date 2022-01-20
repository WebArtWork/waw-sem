# SEM
[Socket.io](https://socket.io), [Express.js](https://expressjs.com) and [Mongodb](https://www.mongodb.com) combo which let you work smoothly on the client side with documents. This part contain CRUD management which connect with wacom, wrcom and wvcom.

## Runners
### Generate new part
`waw add PART_NAME REPO_LINK BRANCH`<br>
`waw add`

## waw Script
### This function accept configuration for `['create', 'get', 'fetch', 'update', 'unique', 'delete']` for the selected part.
`waw.crud(part, config)`
### Variable which contain url for mongodb connection
`waw.mongoUrl`
### Variable which has the storage where sessions will be kept
`waw.store`
### Function which generate router by selected prefix
`waw.router(api)`
### Object application from express, which allow you create custom express routes
`waw.app`
### Function which accept middlewares for express management in the same way with app.use, just make sure it's callback before all other routes
`waw.use(callback)`
### Initialization of waw middleware
`waw.set_middleware(which, callback)`
### waw middleware use to parse express data or server side render
`waw.middleware(which, req, res, next)`
### Express middleware which execute direct access to next function
`waw.next`
### Express middleware which ensure that `req.user` exists.
`waw.ensure`

## Contributing
Thanks for your interest in contributing! Read up on our guidelines for
[contributing](https://github.com/WebArtWork/sem/CONTRIBUTING.md)
and then look through our issues with a [help wanted](https://github.com/WebArtWork/sem/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22)
label.
