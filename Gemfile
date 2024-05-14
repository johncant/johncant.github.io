source "https://rubygems.org"

require 'json'
require 'open-uri'

versions = JSON.parse(::URI.parse("https://pages.github.com/versions.json").read)

gem "jekyll"
gem "github-pages", versions['github-pages']
gem "redcarpet"
gem "base64"
gem "webrick", "~> 1.8"
