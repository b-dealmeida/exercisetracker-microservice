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
  // Generate an id and ensure it's unique
  let idTaken = false
  let _id = 0
  do {
    _id = crypto.randomBytes(12).toString('hex')

    users.forEach(user => {
      if(user['_id'] === _id) {      
        idTaken = true
        return
      }
    })
  } while(idTaken)

  // Create user's object
  const user = {
    _id: _id,
    username: req.body.username
  }

  users.push(user)
  res.json(user)
})

// Post an exercise for a user
app.post('/api/users/:id/exercises', (req, res) => {
  const id = req.params.id
  const {description, duration, date} = req.body

  // Find user
  const user = users.find(u => u._id === id)
  if(!user) {
    res.send('Could not find user')
    return
  }

  // Create and save exercise object
  const exercise = {
    _id: user._id,
    username: user.username,
    description: description,
    duration: parseInt(duration),
    date: date ? new Date(date) : new Date()
  }
  exercises.push(exercise)

  // Reply to user
  res.json({
    ...exercise,
    date: exercise.date.toDateString()
  })
})

// Allow users to be searched and returned
app.get('/api/users/', (req, res) => {
  if(users.length === 0)
    res.send('No users')
  else
    res.json(users)
})

app.get('/api/users/:id/logs', (req, res) => {
  const id = req.params.id
  let {from, to, limit} = req.query

  // Convert query args to dates
  if(from)
    from = new Date(from)
  if(to)
    to = new Date(to)

  // Find user
  const user = users.find(u => u._id === id)
  if(!user) {
    res.send('Could not find user')
    return
  }

  // Filter exercises
  let matchingExercises = exercises.filter(e => {
    return e._id === id && 
    ((from && e.date.getTime() >= from.getTime()) || !from) && 
    ((to && e.date.getTime() <= to.getTime()) || !to)
  })

  // Constrain to (limit) entries
  if(limit && matchingExercises.length > limit)
    matchingExercises = matchingExercises.slice(0, limit);

  // Format filtered exercises for return
  matchingExercises = matchingExercises.map(e => {return {
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }})

  let result = {
    ...user,
    count: matchingExercises.length,
    log: matchingExercises
  }
  if(from)
    result['from'] = from.toDateString()
  if(to)
    result['to'] = to.toDateString()

  res.json(result)
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
