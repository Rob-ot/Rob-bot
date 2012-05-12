
var request = require('request')
var host = 'http://dev.i.tv:3026'
var newPlayerData = {
  name: 'Rob-ot',
  source: 'https://github.com/Rob-ot/Rob-bot'
}
var allDirections = [ 'Up', 'Down', 'Left', 'Right']
var gameInfo

function req (method, route, opts, cb) {
  request({
    method: method,
    url: host + route,
    json: opts.body
  },
  function (err, response, body) {
    if (err) return console.error('There was a request error', err)
    try {
      body = JSON.parse(body)
    }
    catch (e) {
    }
    cb(err, body)
  })
}

function getPlayer (cb) {
  req('post', '/players', {body: newPlayerData}, function (err, playerId) {
    console.log("posted", playerId)
    cb(playerId)
  })
}

function spawnMinion (playerId) {
  req('post', '/players/' + playerId + '/minions', {body: {x: Math.floor(Math.random() * gameInfo.width), y: Math.floor(Math.random() * gameInfo.height), name: 'Scarab', sprite: 'monster7-7-2'}}, function (err, minionId) {
    console.log('made minion', err, minionId)
    if (minionId.message === 'Not Found') return start()
    setTimeout(function () {
      moveMinion(playerId, minionId)
    }, gameInfo.tick)
  })
}

function distance (a, b) {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2))
}

function moveMinion (playerId, minionId) {
  req('get', '/minions/' + minionId, {}, function (err, minion) {
    if (!minion || minion.message === 'Not Found') return spawnMinion(playerId)

    req('get', '/game/objects', {}, function (err, objects) {
      var target = objects.filter(function (o) {
        return o.name !== minion.name
      }).map(function (o, i) {
        o.distance = distance(o, minion)
        return o
      }).sort(function (a, b) {
        return a.distance - b.distance
      })[0]

      var action
      var direction

      if (!target) {
        action = 'Move'
        direction = randomElement(allDirections)
      }
      else {      
        var attackDirection = getAttackDirection(minion, target)
        if (attackDirection) {
          action = 'Attack'
          direction = attackDirection
        }
        else {
          action = 'Move'
          direction = getDirectionToGoTo(minion, target)
        }
      }

      console.log(action + 'ing', direction)

      req('post', '/players/' + playerId + '/minions/' + minionId + '/commands', {body: {action: action, direction: direction}}, function (err, move) {
        setTimeout(function () {
          moveMinion(playerId, minionId)
        }, gameInfo.tick)
      })
    })
  })
}

function getAttackDirection (player, target) {
  if (player.y === target.y) {
    if (player.x + 1 === target.x) return 'Right'
    if (player.x - 1 === target.x) return 'Left'
  }
  if (player.x === target.x) {
    if (player.y + 1 === target.y) return 'Down'
    if (player.y - 1 === target.y) return 'Up'
  }

  return null
}

function getDirectionToGoTo (player, target) {
  var moveOptions = []
  if (player.x > target.x) moveOptions.push('Left')
  if (player.x < target.x) moveOptions.push('Right')
  if (player.y > target.y) moveOptions.push('Up')
  if (player.y < target.y) moveOptions.push('Down')

  return randomElement(moveOptions)
}

function randomElement (arr) {
  if (!arr.length) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

function start () {
  console.log('start')
  req('get', '/game/info', {}, function (err, info) {
    gameInfo = info

    getPlayer(function (playerId) {
      spawnMinion(playerId)
    })
  })
}

start()

