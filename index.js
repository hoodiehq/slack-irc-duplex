var slackChannel = process.env.SLACK_CHANNEL
var ircChannel = process.env.IRC_CHANNEL

var http = require('http')

var Slack = require('slack-client')
var slack = new Slack(process.env.SLACK_TOKEN , true, true)

var irc = require('irc')
var client = new irc.Client('irc.freenode.net', 'slackbot', {
    channels: [ircChannel],
})

slack.on('message', function(message) {
  if (!message.channel || !message.user) return

  var channel = slack.getChannelGroupOrDMByID(message.channel).name
  var user = slack.getUserByID(message.user).name
  var text = message.text

  if (channel !== slackChannel) return

  var users = message._client.users
  Object.keys(users).forEach(function(user) {
    text = text.replace(new RegExp(
      '<@' + user + '>', 'gm'),
      '@' + slack.getUserByID(user).name
    )
  })

  client.say(ircChannel, '<' + user + '> ' + text)
})

slack.login()

client.addListener('message', function (user, channel, text) {
  if (channel !== ircChannel) return
  slack.getChannelByName(slackChannel).send('*' + user + '* ' + text)
})

var server = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'})
  res.end('beep boop\nSyncing Slack#' + slackChannel + ' to IRC' + ircChannel)
})

server.listen(process.env.PORT || 8000);
