#!/bin/node
// or
// #!/bin/bun run

"use strict";
const fs = require("fs");

const PORT = 8080;
const POKEMONS = [];

(async () => {
  let offset = 0;
  while(true){
    let j;
    try{
      j = await (await fetch("https://pokeapi.co/api/v2/pokemon/?offset=" + offset + "&limit=20")).json();
    }catch(e){
      console.error(e);
      return;
    }
    const r = j.results;
    for(let i = 0; i < r.length; ++i) {
      const id = Number(r[i].url.replace(/^.*\/(\d+)\/$/, "$1"));
      if(id > 10000){
        console.log("Pokemons loaded!");
        return;
      }
      POKEMONS.push(["#" + "0".repeat(4 - Math.trunc(Math.log10(id))) + id, r[i].name]);
    }
    offset += 20;
  }
})();

function routeIndex(res){
  fs.readFile(__dirname + "/index.html", (err, data) => {
    if(err){
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Server error");
    }else{
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    }
  });
}

function routeStyle(res){
  fs.readFile(__dirname + "/style.css", (err, data) => {
    if(err){
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Server error");
    }else{
      res.writeHead(200, { "Content-Type": "text/css" });
      res.end(data);
    }
  });
}

function routePokemonList(res){
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(POKEMONS));
}

async function routePokemonInfo(res, id){
  const pokemon = {};

  if(id < 1 || POKEMONS.length < id){
    res.writeHead(400, { "Content-Type": "text/plain" });
    return res.end("Unknown pokemon");
  }

  const j = await (await fetch("https://pokeapi.co/api/v2/pokemon/" + id)).json();

  pokemon.name = j.name;
  pokemon.id = id;
  pokemon.stats = {};
  j.stats.forEach(v => {
    pokemon.stats[v.stat.name] = v.base_stat;
  });
  pokemon.types = [];
  j.types.forEach(v => {
    pokemon.types.push(v.type.name);
  });

  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(pokemon));
}

async function routePokemonImages(res, id){
  const images = {};

  if(id < 1 || POKEMONS.length < id){
    res.writeHead(400, { "Content-Type": "text/plain" });
    return res.end("Unknown pokemon");
  }

  const j = await (await fetch("https://pokeapi.co/api/v2/pokemon/" + id)).json();

  const imgs_urls = [
    ["main",  j.sprites.other["official-artwork"].front_default, "data:image/png;base64,"],
    ["front", j.sprites.other.showdown.front_default,            "data:image/gif;base64,"],
    ["back",  j.sprites.other.showdown.back_default,             "data:image/gif;base64,"],
  ];

  for(const v of imgs_urls) {
    if(v[1]){
      const arrayBuffer = await (await fetch(v[1])).arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      images[v[0]] = v[2] + base64;
    }
  }

  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  return res.end(JSON.stringify(images));
}

async function routeTitleImg(res){
  const url = "https://raw.githubusercontent.com/PokeAPI/media/master/logo/pokeapi_256.png"

  res.writeHead(200, { "Content-Type": "image/png" });
  return res.end(await (await fetch(url)).arrayBuffer());
}

async function server(req, res){
  const url = req.url.split("?")[0]

  if(req.method != "GET"){
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found\n");
    return
  }

  if(url === "/" || url === "/index.html") {
    routeIndex(res);
  }else if(url === "/style.css"){
    routeStyle(res);
  }else if(url === "/pokemons.json"){
    routePokemonList(res);
  }else if(url === "/title.png"){
    try{
      await routeTitleImg(res);
    }catch(e){
      console.error(e);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Server error");
    }

  }else if(url.match(/^\/api\/\d+\.json$/)){
    const id = url.replace(/^\/api\/(\d+)\.json$/, "$1");

    try{
      await routePokemonInfo(res, id);
    }catch(e){
      console.error(e);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Server error");
    }

  // /api/1/images.json
  }else if(url.match(/^\/api\/\d+\/images\.json$/)){
    const id = url.replace(/^\/api\/(\d+)\/images\.json$/, "$1");

    try{
      await routePokemonImages(res, id);
    }catch(e){
      console.error(e);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Server error");
    }
  }
}

require("http").createServer(server).listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT + "/");
});
