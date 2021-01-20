#!/bin/bash

# Installation steps needed to install grunt and successfully compile translations:

npm install "grunt"
npm install "grunt-contrib-uglify"
npm install "grunt-contrib-concat"
npm install "grunt-contrib-watch"
npm install "grunt-css"
npm install "grunt-markdown"
npm install "grunt-macreload"
npm install "grunt-angular-gettext"
npm install "bower"
./node_modules/.bin/bower install

# extract: ./node_modules/.bin/grunt nggettext_extract 

# This action will create a template.pot file in po/ folder. You can open it with some PO editor (Poedit). 
# Read this http://angular-gettext.rocketeer.be/dev-guide/translate/ guide to learn how to edit/update/import PO files from a generated POT file. 
# PO file will be generated inside po/ folder.
# If you make new changes, simply run grunt compile again to generate a new .pot template 
# and the angular javascript js/translations.js. Then (if use Poedit), open .po file and choose update from POT File from Catalog menu.

# Don't forget to add your language in public/src/js/controllers/footer.js  (!)

# launch: ./node_modules/.bin/grunt compile
