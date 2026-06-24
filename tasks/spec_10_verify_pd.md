  Added script/scrape-new-product-sources.js and wired scripts in script/package.json. It
  scrapes all three sources and writes one JSON file per record plus products-tree.json
  under:

  - data/products/viglaceratiles/ - 1,850 products
  - data/products/eurotile/ - 90 products
  - data/products/vastastone/ - 34 collections

Problem is, there might many product redundant with our current data/product/*.json, and also they redundant each other.

What are the solutions for that?
a. Graph them as a knowledge base, and later check for chunk of 100, to map the redundant?
b. Just check them to remove the redundant?

And our current website also have "collection", will they somehow map with our current structure?

Pick the most fit approach, and tell me how will you do, and we will continue.
