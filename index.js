const crypto = require("crypto")
const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(express.urlencoded({extended: true}));

users = []
exercises = []

// Allow the creation of a new user
app.post('/api/users', (req, res) => {
  // Ensure username isn't already taken
  let usernameTaken = false
  users.forEach(user => {
    if(user['username'] === req.body['username']) {      
      usernameTaken = true
      return
    }
  })

  // Return error if username taken
  if(usernameTaken) {
    res.json({'error': 'Username already exists'})
    return
  }

  // Generate an id and ensure it's not taken
  let idTaken = false
  let id = 0
  do {
    id = crypto.randomBytes(12).toString('hex')

    users.forEach(user => {
      if(user['_id'] === id) {      
        idTaken = true
        return
      }
    })
  } while(idTaken)

  // Create user's object
  let user = {
    'username': req.body['username'], 
    '_id': id
  }

  users.push(user)
  res.json(user)
})

// Allow users to be searched and returned
app.get('/api/users/:search?', (req, res) => {
  const search = req.params.search

  // Send all users if search term was omitted
  if(search == undefined) {
    res.json(users)
    return
  }

  // Search username and _id fields for match
  let userFound = false
  users.forEach(user => {
    if(user['_id'] === search || user['username'] === search) {
      userFound = true
      res.json(user)
    }
  })

  if(!userFound)
    res.json({'error': 'User not found'})
})

function getUserIndex(id) {
  let userIndex = 0
  while(userIndex < users.length && users[userIndex]['_id'] !== id) {
    userIndex++
  }

  return userIndex
}

// Post an exercise for a user
app.post('/api/users/:id/exercises', (req, res) => {
  const id = req.params.id
  const description = req.body['description']
  const duration = parseInt(req.body['duration'])
  const date = (new Date(req.body['date'])).toDateString()

  // Check if inputs are valid
  if(Number.isNaN(duration)) {
    res.json({'error': 'Duration must be a number'})
    return
  }
  if(date === 'Invalid Date') {
    res.json({'error': 'Date must be in format \'yyyy-mm-dd\''})
    return
  }

  // Find user
  const userIndex = getUserIndex(id)
  if(userIndex === users.length) {
    res.json({'error': 'User not found'})
    return
  }
  const username = users[userIndex]['username']

  // Add exercise
  const exercise = {
    'username': username,
    '_id': id,
    'description': description,
    'duration': duration,
    'date': date
  }

  exercises.push(exercise)
  res.json(exercise)
})

app.get('/api/users/:id/logs', (req, res) => {
  const id = req.params.id
  const from = new Date(req.query.from)
  const to = new Date(req.query.to)
  const limit = req.query.limit

  // Find user
  const userIndex = getUserIndex(id)
  if(userIndex === users.length) {
    res.json({'error': 'User not found'})
    return
  }
  const username = users[userIndex]['username']

  // Find exercises
  let matchingExercises = []
  exercises.forEach(exercise => {
    const exerciseDate = (new Date(exercise['date']))
    if(
      exercise['_id'] === id && 
      ((from != 'Invalid Date' && exerciseDate >= from) || 
      from == 'Invalid Date') && 
      ((to != 'Invalid Date' && exerciseDate <= to) || 
      to == 'Invalid Date') && 
      ((limit != undefined && 
      matchingExercises.length < limit) ||
      limit == undefined)
    ) {
      matchingExercises.push({
        'description': exercise['description'],
        'duration': exercise['duration'],
        'date': exercise['date']
      })
    }
  })

  res.json({
    ...users[userIndex],
    count: matchingExercises.length,
    log: matchingExercises
  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
