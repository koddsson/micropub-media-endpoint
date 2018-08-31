/* eslint-disable no-console */

const aws = require('aws-sdk')
const express = require('express')
const multer = require('multer')
const multerS3 = require('multer-s3')

const app = express()

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
}).array('upload', 1)

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

  upload(request, response, function(error, filename) {
    if (error) {
      console.log(error)
      return response.status(400)
    }
    response.header('Location', `https://koddsson-media.ams3.digitaloceanspaces.com/${filename}`)
    response.status(201)
  })
})

app.listen(port, function() {
  console.log(`Server listening on port ${port}.`)
})
