const TelegramBot = require("node-telegram-bot-api");
const TOKEN =
  process.env.TELEGRAM_TOKEN || "553011091:AAHNN1kCFBOhCz18Qw9Rsf5gh1u3gOOloEc";
const options = {
  webHook: {
    port: process.env.PORT
  }
};
const url =
  process.env.APP_URL || "https://aqueous-island-48302.herokuapp.com:443";
const bot = new TelegramBot(TOKEN, options);
const fs = require("fs");
const db = require("./db");

bot.setWebHook(`${url}/bot${TOKEN}`);

function saveData(sendedMessageId = "") {
  stats.lastMessageId = sendedMessageId === undefined ? "" : sendedMessageId;

  // fs.writeFile("ggr_bot_data.json", JSON.stringify(stats), "utf8", err => {
  //   if (err) {
  //     console.log("ошибка сохранения файла!");
  //     console.log(err);
  //   }
  //   console.log("The file was saved!");
  // });

  const queryText = "insert into stat(object) values($1)";

  const values = [JSON.stringify(stats)];
  //db.query(queryText, values, (err, res) => {

  db.query(queryText, values, (err, res) => {
    if (err) {
      console.log(err);
      console.log("Не записали строку");
    } else {
      console.log("Записали строку");
    }
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

  // fs.writeFile("ggr_bot_data.json", JSON.stringify(stats), "utf8", err => {
  //   if (err) {
  //     console.log("Файл не сохранен");
  //     console.log(err);
  //     callback();
  //   }
  //   console.log("The file was saved!");
  //   callback();
  // });

  const queryText = "insert into stat(object) values($1)";

  const values = [JSON.stringify(stats)];
  //db.query(queryText, values, (err, res) => {

  db.query(queryText, values, (err, res) => {
    if (err) {
      console.log(err);
      console.log("Не записали строку");
      callback();
    } else {
      console.log("Записали строку");
      callback();
    }
  });
}

function readData(callback) {
  // fs.readFile("ggr_bot_data.json", "utf8", (err, data) => {
  //   if (err) {
  //     console.log("Не прочитали файлик");
  //     resetStats(() => {
  //       callback();
  //     });
  //   } else {
  //     console.log("Успешно прочитали файлик");
  //     stats = JSON.parse(data);
  //     callback();
  //   }
  //});

  const queryText = "select object from stat";

  //const values = [-233162232, true];
  //db.query(queryText, values, (err, res) => {

  db.query(queryText, [], (err, res) => {
    if (err) {
      console.log(err);
      console.log("Не прочитали базу");
      resetStats(() => {
        callback();
      });
    } else {
      console.log(res.rows[res.rowCount - 1]);
      console.log("Успешно прочитали базу");
      stats = JSON.parse(res.rows[res.rowCount - 1].object);
      callback();
    }
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
      if (stats.totalSum + sum >= stats.total) {
        stats.table[stats.table.length - 1].sum = stats.total - stats.totalSum;
      }
    } else {
      replyToMessage(msg.chat.id, "Ты еще нихера не вкинул!", msg.message_id);
    }
  } else {
    console.log("Нашли " + JSON.stringify(currentUserObj));
    if (sum > 0 && stats.totalSum + sum <= stats.total) {
      stats.table[currentIndex].sum += sum;
    } else {
      stats.table[currentIndex].sum += stats.total - stats.totalSum;
    }
  }
  stats.totalSum =
    stats.totalSum + sum >= stats.total ? stats.total : stats.totalSum + sum;
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
    .then(res => {
      console.log(res);
    })
    .catch(err => {
      console.log(err);
    });
}

///*************************************

readData(() => {});

bot.onText(/\/send@ggr_tyumen_bot (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const summ = +match[1];

  console.log("есть контакт");
  if (isNaN(summ) || summ === 0) {
    replyToMessage(chatId, "Напиши сумму! цифрами!", msg.message_id);
  } else if (stats.total === 0) {
    replyToMessage(chatId, "Сначала установи собираемую сумму", msg.message_id);
  } else if (stats.total !== 0 && stats.total === stats.totalSum) {
    replyToMessage(chatId, "Бабло уже собрано! не тормози)", msg.message_id);
  } else if (stats.totalSum + summ > stats.total) {
    let messageText = `Бабло собрано, оставь себе ${stats.totalSum +
      summ -
      stats.total}₽`;
    replyToMessage(chatId, messageText, msg.message_id);

    testSender(msg, summ);

    sendMessage(msg);
  } else if (stats.totalSum < stats.total) {
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
    replyToMessage(msg.chat.id, "Напиши сумму! цифрами", msg.message_id);
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
      replyToMessage(msg.chat.id, "Напиши сумму! цифрами", msg.message_id);
      break;
    case "/send@ggr_tyumen_bot":
      replyToMessage(msg.chat.id, "Напиши сумму! цифрами", msg.message_id);
      break;
  }
});
