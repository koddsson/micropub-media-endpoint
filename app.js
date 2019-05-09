const path = require('path')
const aws = require('aws-sdk')
const express = require('express')
const morgan = require('morgan')
const fetch = require('node-fetch')
const imagemin = require('imagemin')
const fileParser = require('express-multipart-file-parser')
const imageminJpegtran = require('imagemin-jpegtran')
const imageminPngquant = require('imagemin-pngquant')

require('dotenv').config()

const app = express()

app.use(morgan('combined'))
app.use(fileParser)

const s3 = new aws.S3({
  endpoint: new aws.Endpoint(process.env.S3_ENDPOINT)
})

const supportedFiles = ['.png', '.jpg', '.jpeg']

function uploadImage(filename, file) {
  return new Promise((resolve, reject) => {
    s3.putObject(
      {
        Bucket: process.env.S3_BUCKET,
        ACL: 'public-read',
        Key: filename,
        Body: file,
        CacheControl: 'max-age=31536000',
        ContentDisposition: 'inline',
        ContentType: `image/${filename.split('.')[1]}`
      },
      (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      }
    )
  })
}

app.post('/upload', async function(request, response) {
  // TODO: Change this to a middleware
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

  if (request.files.length > 1) {
    return response.status(400).send('I currently only support one image at a time')
  }

  const filename = request.files[0].originalname
  const extension = path.extname(filename)

  if (!supportedFiles.includes(extension)) {
    return response.status(400).send(`I currently only support files with the extensions: ${supportedFiles.join(',')}.`)
  }

  const compressedImage = await imagemin.buffer(request.files[0].buffer, {
    plugins: [
      imageminJpegtran(),
      imageminPngquant({
        quality: [0.6, 0.8]
      })
    ]
  })

  try {
    await uploadImage(filename, compressedImage)
  } catch (error) {
    return response.status(500).send(error.toString())
  }

  response.header('Location', `https://${process.env.S3_BUCKET}.${process.env.S3_ENDPOINT}/${filename}`)
  return response.status(201).send('Created')
})

module.exports = app
