import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "3754",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [ //ovo je primjer samo da imam predstavu kako to izgleda
  { id: 1, name: "Angela", color: "teal" },//to se odma overwrit-uje
  { id: 2, name: "Jack", color: "powderblue" },
];
//ovde pomocu ovog querija daje county_code-ove od odredjenog korisnika pomocu id
async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
//funkcija za uzimanje trenutnog korisnika (currentUser je default 1 zato da kad se ucita stranica izbaci onog prvog odma)
async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}
//uzimaju se vrijednosti iz korisnika i drzava i salju u ejs fajl
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();//provjerava se ko je trenutni korisnik pomocu funkcije

  try {
    const result = await db.query(//uzima se country code na osnovu unesene drzave od strane  korisnika
      "SELECT country_code FROM countries WHERE LOWER(country_names) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;//ovde se spremi country code
    try {
      await db.query(//u tabelu se dodaje kod i korisnik ciji je kod
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);//hvata eror
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");//ako je pritisnuto dugme add new user salje na new.ejs
  } else {
    currentUserId = req.body.user;
    res.redirect("/");//ako je u vrhu ekrana izabran korisnik redirektuje pocetnu stranu
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;//uzima ime i boju koje je korisnik unio

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]//gura te dve vrijednosti u tabelu, tj pravi novog korisnika
  );

  const id = result.rows[0].id;
  currentUserId = id;//kao trenutnog korisnika stavlja ovog novog

  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
