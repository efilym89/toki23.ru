FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

COPY . /tmp/app

RUN rm -rf /usr/share/nginx/html/* \
  && cp -R /tmp/app/index.html /usr/share/nginx/html/index.html \
  && cp -R /tmp/app/admin.html /usr/share/nginx/html/admin.html \
  && cp -R /tmp/app/404.html /usr/share/nginx/html/404.html \
  && cp -R /tmp/app/assets /usr/share/nginx/html/assets \
  && cp -R /tmp/app/data /usr/share/nginx/html/data \
  && printf "window.APP_CONFIG = { DATA_PROVIDER: 'local', ADMIN_LOGIN: 'admin', ADMIN_PASSWORD: 'admin123' };\n" > /usr/share/nginx/html/config.js

EXPOSE 80
