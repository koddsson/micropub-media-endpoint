const aws = require('aws-sdk')
const express = require('express')
const multer = require('multer')
const multerS3 = require('multer-s3')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const ExifTransformer = require('exif-be-gone')
const app = express()

app.use(morgan('combined'))
app.use(bodyParser.urlencoded({extended: true, limit: '100mb'}))
app.use(bodyParser.json())

const s3 = new aws.S3({
  endpoint: new aws.Endpoint(process.env.S3_ENDPOINT)
})

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET,
    acl: 'public-read',
    contentType(req, file, cb) {
      // A hack that pipes the output stream through the exif transformer before after we detect the content type
      // of the stream but before we send it to S3
      multerS3.AUTO_CONTENT_TYPE(req, file, function(_, mime, outputStream) {
        cb(null, mime, outputStream.pipe(new ExifTransformer({readableObjectMode: true, writableObjectMode: true})))
      })
    },
    key(request, file, cb) {
      // eslint-disable-next-line no-console
      console.log(file)
      cb(null, file.originalname)
    }
  })
}).array('file', 1)

app.post('/upload', async function(request, response) {
  const authResponse = await fetch(process.env.AUTH_PROVIDER, {
    headers: {
      Accept: 'application/json',
      Authorization: request.header('Authorization')
    }
  })

  const json = await authResponse.json()
  if (json.me !== process.env.HOMEPAGE) {
    return response.status(401).send('Unauthorized')
  }

  upload(request, response, function(error) {
    if (error) {
      // eslint-disable-next-line no-console
      console.log(error)
      return response.status(400).send('Not found')
    }
    const filename = request.files[0].originalname
    response.header('Location', `https://${process.env.S3_BUCKET}.${process.env.S3_ENDPOINT}/${filename}`)
    return response.status(201).send('Created')
  })
})

module.exports = app
