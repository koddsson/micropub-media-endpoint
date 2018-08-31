/* eslint-disable no-console */

const aws = require('aws-sdk')
const express = require('express')
const multer = require('multer')
const multerS3 = require('multer-s3')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')

const app = express()
app.use(morgan('combined'))
app.use(bodyParser.urlencoded({extended: true, limit: '100mb'}))
app.use(bodyParser.json())

const spacesEndpoint = new aws.Endpoint('ams3.digitaloceanspaces.com')
const s3 = new aws.S3({
  endpoint: spacesEndpoint
})

const upload = multer({
  storage: multerS3({
    s3,
    bucket: 'koddsson-media',
    acl: 'public-read',
    key(request, file, cb) {
      console.log(file)
      cb(null, file.originalname)
    }
  })
}).array('file', 1)

const port = process.env.PORT || 3000

app.post('/upload', async function(request, response) {
  const authResponse = await fetch('https://tokens.indieauth.com/token', {
    headers: {
      Accept: 'application/json',
      Authorization: request.header('Authorization')
    }
  })

  const json = await authResponse.json()
  if (json.me !== 'https://koddsson.com/') {
    return response.status(401).send('Unauthorized')
  }

  console.log(request)
  upload(request, response, function(error, filename) {
    console.log(request)
    if (error) {
      console.log(error)
      return response.status(400).send('Not found')
    }
    response.header('Location', `https://koddsson-media.ams3.digitaloceanspaces.com/${filename}`)
    return response.status(201).send('Created')
  })
})

app.listen(port, function() {
  console.log(`Server listening on port ${port}.`)
})
