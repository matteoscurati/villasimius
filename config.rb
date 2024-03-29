require 'uglifier'

###
# Page options, layouts, aliases and proxies
###

# Per-page layout changes:
#
# With no layout
page '/*.xml', layout: false
page '/*.json', layout: false
page '/*.txt', layout: false

###
# Dato configuration
###

activate :dato,
  domain: 'twilight-hill-952.admin.datocms.com',
  token: '34fa2fe352265e93f16eab9346740af0432c20c2fd8a27f561',
  base_url: 'https://villasimius.netlify.com/'

###
# Dato items
###


# With alternative layout
# page "/path/to/file.html", layout: :otherlayout

# Proxy pages (http://middlemanapp.com/basics/dynamic-pages/)
# proxy "/this-page-has-no-template.html", "/template-file.html", locals: {
#  which_fake_page: "Rendering a fake page with a local variable" }

# Localization
# activate :i18n

# Slim
Slim::Engine.set_options format: :html
Slim::Engine.set_options pretty: false

# Assets
set :css_dir, 'dist/stylesheets'
set :js_dir, 'dist/javascripts'
set :images_dir, 'dist/images'

# External pipeline
activate :external_pipeline,
  name: :gulp,
  command: build? ? 'gulp build --production' : './node_modules/gulp/bin/gulp.js',
  source: "dist",
  latency: 1

# Build-specific configuration
configure :build do
  ignore 'assets/*'
  activate :gzip
  activate :minify_html, remove_intertag_spaces: true
  activate :asset_hash
  activate :relative_assets
end

#helpers
helpers do
  def markdown(text)
    Tilt['markdown'].new { text }.render(scope=self)
  end

  def name(first_name, last_name)
    "#{first_name} #{last_name}"
  end
end
