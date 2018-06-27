const { Pool } = require("pg");

const connectionString =
  "postgres://ygzpsefobgvrjt:3c8f527d498f5aad03481aefa0a137ce0fa9d8dc19cb75f0b9fb3eb5f935b7e9@ec2-23-21-129-50.compute-1.amazonaws.com:5432/d1qiabdafurli";
//"postgres://YourUserName:YourPassword@localhost:5432/YourDatabase";

const pool = new Pool({
  connectionString: connectionString,
  ssl: true
});

module.exports = {
  query: (text, params, callback) => {
    const start = Date.now();
    return pool.query(text, params, (err, res) => {
      const duration = Date.now() - start;
      console.log("executed query", { text, duration, rows: res.rowCount });
      callback(err, res);
    });
  },
  getClient: callback => {
    pool.connect((err, client, done) => {
      const query = client.query.bind(client);

      // monkey patch the query method to keep track of the last query executed
      client.query = () => {
        client.lastQuery = arguments;
        client.query.apply(client, arguments);
      };

      // set a timeout of 5 seconds, after which we will log this client's last query
      const timeout = setTimeout(() => {
        console.error("A client has been checked out for more than 5 seconds!");
        console.error(
          `The last executed query on this client was: ${client.lastQuery}`
        );
      }, 5000);

      const release = err => {
        // call the actual 'done' method, returning this client to the pool
        done(err);

        // clear our timeout
        clearTimeout(timeout);

        // set the query method back to its old un-monkey-patched version
        client.query = query;
      };

      callback(err, client, done);
    });
  }
};
