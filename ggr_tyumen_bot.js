const TelegramBot = require("node-telegram-bot-api");
const token = '553011091:AAHNN1kCFBOhCz18Qw9Rsf5gh1u3gOOloEc';
// const bot = new TelegramBot(token, { polling: true });

const TOKEN = process.env.TELEGRAM_TOKEN || token;
const options = {
  webHook: {
    // Port to which you should bind is assigned to $PORT variable
    // See: https://devcenter.heroku.com/articles/dynos#local-environment-variables
    port: process.env.PORT
    // you do NOT need to set up certificates since Heroku provides
    // the SSL certs already (https://<app-name>.herokuapp.com)
    // Also no need to pass IP because on Heroku you need to bind to 0.0.0.0
  }
};
// Heroku routes from port :443 to $PORT
// Add URL of your app to env variable or enable Dyno Metadata
// to get this automatically
// See: https://devcenter.heroku.com/articles/dyno-metadata
const url = process.env.APP_URL || 'https://fierce-savannah-13630.herokuapp.com:443';
const bot = new TelegramBot(TOKEN, options);

// This informs the Telegram servers of the new webhook.
// Note: we do not need to pass in the cert, as it already provided
bot.setWebHook(`${url}/bot${TOKEN}`);

const fs = require("fs");
let stats = {};

function saveData(sendedMessageId = "") {
  stats.lastMessageId = sendedMessageId === undefined ? "" : sendedMessageId;

  fs.writeFile("ggr_bot_data.json", JSON.stringify(stats), "utf8", err => {
    if (err) {
      console.log("ошибка сохранения файла!");
      console.log(err);
    }

    console.log("The file was saved!");
  });
}

function resetStats(callback) {
  stats = {
    total: 0,
    totalSum: 0,
    lastMessageId: "",
    table: []
  };

  console.log("сброс статистики");

  fs.writeFile("ggr_bot_data.json", JSON.stringify(stats), "utf8", err => {
    if (err) {
      console.log("Файл не сохранен");
      console.log(err);
      callback();
    }
    console.log("The file was saved!");
    callback();
  });
}

function testSender(msg, sum) {
  let currentUserObj = {
    firstName: msg.from.first_name,
    lastName: msg.from.last_name,
    sum: sum
  };

  let currentIndex = stats.table.findIndex(element => {
    return element.lastName === currentUserObj.lastName;
  });

  if (currentIndex === -1) {
    console.log("Не нашли " + JSON.stringify(currentUserObj));
    if (sum > 0) {
      stats.table.push(currentUserObj);
    } else {
      replyToMessage(msg.chat.id, "Ты еще нихера не вкинул!", msg.message_id);
    }
  } else {
    console.log("Нашли " + JSON.stringify(currentUserObj));
    if (sum > 0 && stats.totalSum + sum <= stats.total) {
      stats.table[currentIndex].sum += sum;
    }
  }
  stats.totalSum += sum;
}

function readData(callback) {
  fs.readFile("ggr_bot_data.json", "utf8", (err, data) => {
    if (err) {
      console.log("Не прочитали файлик");
      resetStats(() => {
        callback();
      });
    } else {
      console.log("Успешно прочитали файлик");
      stats = JSON.parse(data);
      callback();
    }
  });
}

function sendMessage(msg) {
  let chatId = msg.chat.id;
  let messageText = `Собираем ${stats.total} ₽`;
  messageText += `\nСобрали ${stats.totalSum} ₽`;
  if (msg.text == "/reset@ggr_tymen_bot") {
  } else {
    bot
      .getChatMembersCount(chatId)
      .then(membersCount => {
        console.log("Получили количество чатеров");

        stats.table.forEach(
          user =>
            (messageText += `\n+ ${
              user.firstName !== undefined ? user.firstName : ""
            } ${user.lastName !== undefined ? user.lastName : ""} ${
              user.sum !== undefined ? user.sum : 0
            }`)
        );
        messageText += `\nЖдунов ${String(
          membersCount - stats.table.length - 1
        )}`;

        bot
          .sendMessage(chatId, messageText)
          .then(sendedMessage => {
            saveData(sendedMessage.message_id);
          })
          .catch(err => console.log(err));
      })
      .catch(err => {
        console.log("Не получили количество чатеров");
        console.log(err);
      });
  }
}

function replyToMessage(chatId, messageText, messageID) {
  bot
    .sendMessage(chatId, messageText, {
      reply_to_message_id: messageID
    })
    .then(() => {})
    .catch(() => {});
}

bot.onText(/\/send@ggr_tyumen_bot (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const summ = +match[1];

  console.log("есть контакт");

  if (isNaN(summ) || summ === 0) {
    replyToMessage(chatId, "Напиши сумму!", msg.message_id);
  } else if (stats.totalSum + summ > stats.total) {
    const messageText = `Слыш Абрамович, нам нужно лишь ${stats.total -
      stats.totalSum} ₽`;
    replyToMessage(chatId, messageText, msg.message_id);
  } else {
    console.log("есть сумма");

    readData(res => {
      testSender(msg, summ);

      let lastMessageId = stats.lastMessageId;

      if (lastMessageId !== "") {
        bot
          .deleteMessage(chatId, lastMessageId)
          .then(res => {
            console.log(res);
          })
          .catch(err => {
            console.log(err);
          });
      }

      sendMessage(msg);
      console.log(res);
    });
  }
});

bot.onText(/\/set_total@ggr_tyumen_bot (.+)/, (msg, match) => {
  const sum = +match[1];

  if (isNaN(sum)) {
    console.log("сумма isNaN");
    replyToMessage(msg.chat.id, "Напиши сумму!", msg.message_id);
  } else {
    console.log("Словили сообщение");
    readData(res => {
      stats.total = sum;

      sendMessage(msg);
      console.log(res);
    });
  }
});

bot.on("message", msg => {
  switch (msg.text) {
    case "/reset@ggr_tyumen_bot":
      resetStats(res => {
        sendMessage(msg);
        console.log(res);
      });
      break;
    case "/set_total@ggr_tyumen_bot":
      replyToMessage(msg.chat.id, "Напиши сумму!", msg.message_id);
      break;
    case "/send@ggr_tyumen_bot":
      replyToMessage(msg.chat.id, "Напиши сумму!", msg.message_id);
      break;
  }
});
