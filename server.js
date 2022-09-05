// server/server.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const request = require("request");

const itemsQueryApi = "https://api.mercadolibre.com/sites/MLA/search?q=:";
const itemInfoApi = "https://api.mercadolibre.com/items/";

let options = {
  headers: {},
};

const app = express();
const port = 8000;

app.use(bodyParser.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const getItemDescription = async (id) => {
  return new Promise((resolve, reject) => {
    options.url = itemInfoApi + id + "/description";
    request(options, async function (error, response, body) {
      if (!error && response.statusCode == 200) {
        const itemDescription = JSON.parse(body);
        resolve(itemDescription);
      }
    });
  });
};

app.get("/api/items", async (req, res) => {
  options.url = itemsQueryApi + req.query.q;
  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      const parsedData = JSON.parse(body);
      const formatedData = {
        author: {
          name: "",
          lastname: "",
        },
        categories: parsedData?.filters[0]?.values[0]?.path_from_root.map(
          (category) => category.name
        ),
        items: parsedData.results.slice(0, 4).map((item) => {
          return {
            id: item.id,
            title: item.title,
            price: {
              currency: item.currency_id,
              amount: parseInt(item?.price?.toString().split(".")[0]),
              decimals: 0,
            },
            picture: item.thumbnail,
            condition: item.condition,
            free_shipping: item.shipping.free_shipping,
            state: item.address.state_name,
          };
        }),
      };
      res.send(formatedData);
    }
  });
});

(async () => {
  app.get("/api/items/:id", async (req, res) => {
    options.url = itemInfoApi + req.params.id;
    request(options, async function (error, response, body) {
      if (!error && response.statusCode == 200) {
        const parsedData = JSON.parse(body);
        //split price amount into integer and decimal
        const price = parsedData.price.toString().split(".");

        const formatedData = {
          author: {
            name: "",
            lastname: "",
          },
          item: {
            id: parsedData.id,
            title: parsedData.title,
            price: {
              currency: parsedData.currency_id,
              amount: parseInt(price[0]),
              decimals: price[1] ? price[1] : 0,
            },
            picture: parsedData.pictures[0].url,
            condition: parsedData.condition,
            free_shipping: parsedData.shipping.free_shipping,
            sold_quantity: parsedData.sold_quantity,
            description: "",
          },
        };
        const itemDescription = await getItemDescription(req.params.id);
        formatedData.item.description = itemDescription.plain_text;
        res.send(formatedData);
      }
    });
  });
})();

app.listen(port);
