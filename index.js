var http = require('http')

var emojis = require('emojis')
var he = require('he')
var inArray = require('in-array')
var invert = require('lodash.invert')
var irc = require('irc')
var Slack = require('slack-client')

var ircToSlack = {}

try {
  if (process.env.CHANNELS) {
    ircToSlack = JSON.parse(process.env.CHANNELS)
  }
} catch (e) {
  console.log('You need to specify the channel mapping as proper JSON')
  process.exit(1)
}

if (process.env.IRC_CHANNEL && process.env.SLACK_CHANNEL) {
  ircToSlack[process.env.IRC_CHANNEL] = process.env.SLACK_CHANNEL
} else if (!process.env.CHANNELS) {
  console.log('Please provide at least one channel mapping')
  process.exit(1)
}

var slackToIrc = invert(ircToSlack)
var ircChannels = Object.keys(ircToSlack)
var slackChannels = Object.keys(slackToIrc)

if (!ircChannels.length) {
  console.log('Please provide at least one channel mapping')
  process.exit(1)
}

var client = new irc.Client('irc.freenode.net', 'slackbot', {channels: ircChannels})
var slack = new Slack(process.env.SLACK_TOKEN, true, true)

console.log('slackToIrc', slackToIrc)
console.log('ircToSlack', ircToSlack)
console.log('ircChannels', ircChannels)
console.log('slackChannels', slackChannels)

// SLACK -> IRC

slack.on('message', function (message) {
  console.log('receiving slack')
  if (!message.channel || !message.user) return

  var channel = slack.getChannelGroupOrDMByID(message.channel).name
  var user = slack.getUserByID(message.user).name
  var text = message.text

  if (!inArray(slackChannels, channel)) return

  var users = message._client.users

  Object.keys(users).forEach(function (id) {
    var name = slack.getUserByID(id).name

    // replace numeric user id with name
    text = text.replace(new RegExp(
      '<@' + id + '>', 'gm'),
      '@' + name
    )

    // remove duplicate user id and name
    text = text.replace(new RegExp(
      '<@' + id + '|' + name + '>', 'gm'),
      ''
    )
  })

  text = emojis.replaceWithUnicode(text)

  /* eslint-disable no-cond-assign */
  // properly format links
  var match
  while (match = text.match(/<([^\|]*)\|([^>]*)>/m)) {
    text = text.replace('|' + match[2], '')
  }
  /* eslint-enable no-cond-assign */

  text = text.replace(':simple_smile:', ['☺︎', '☻'][Math.round(Math.random())])

  text = he.decode(text)

  console.log(channel, slackToIrc[message.channel], user, text)
  client.say(slackToIrc[channel], '<' + user + '> ' + text)
})

slack.on('error', console.log)

slack.on('open', function () {
  console.log('connected to slack')
  // IRC -> SLACK

  client.addListener('message', function (user, channel, text) {
    var slackChannel = ircToSlack[channel]
    if (!slackChannel) return

    slack.getChannelByName(slackChannel).send('*' + user + '* ' + text)
  })

  client.addListener('action', function (user, channel, text) {
    var slackChannel = ircToSlack[channel]
    if (!slackChannel) return
    slack.getChannelByName(slackChannel).send('*' + user + '* _' + text + '_')
  })
})

slack.login()

// Small http server to tell the world what this bot is doing
// handy to keep the heroku instance running

if (process.env.PORT) {
  var server = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'})
    res.end('beep boop' + slackChannels.map(function (slackChannel) {
      return '\nSyncing Slack#' + slackChannel + ' to IRC' + slackToIrc[slackChannel]
    }).join(''))
  })

  server.listen(process.env.PORT)
}
