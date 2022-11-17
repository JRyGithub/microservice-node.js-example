FROM cubyn/node:14

WORKDIR /app

RUN curl -o shmig https://raw.githubusercontent.com/mbucc/shmig/master/shmig && \
    chmod +x shmig

COPY package.json package.json
COPY yarn.lock yarn.lock

ARG NPM_TOKEN

RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc && \
    yarn install --production && \
    rm ~/.npmrc

ARG BUILD_TYPE
RUN if [ "$BUILD_TYPE" = "dev" ]; then yarn install && yarn global add nodemon; fi

ARG GIT_COMMIT_HASH=develop
ENV GIT_COMMIT_HASH ${GIT_COMMIT_HASH}

COPY src src
COPY Makefile Makefile
COPY migrations migrations

ENV CAROTTE_AMQP_PREFETCH=10 \
    CAROTTE_GRACEFUL_SHUTDOWN_TIMEOUT=28000 \
    CAROTTE_TEARDOWN_AMQP_CLOSE_TIMEOUT=15000 \
    CAROTTE_TEARDOWN_MYSQL_TIMEOUT=5000 \
    CAROTTE_LOADER_LEGACY_MODE=true \
    CAROTTE_AMQP_HOST=rabbitmq \
    DB_HOST=mysql \
    DB_PASS=root \
    DB_USER=root \
    DB_PORT=3306 \
    DB_DATABASE=service.support \
    DB_PRODUCT_READ_HOST=mysql \
    DB_PRODUCT_READ_PASS=root \
    DB_PRODUCT_READ_USER=root \
    DB_PRODUCT_READ_PORT=3306 \
    ZENDESK_EMAIL="" \
    ZENDESK_PASSWORD="" \
    ZENDESK_DOMAIN="" \
    ZENDESK_AUTHOR_ID="" \
    ZENDESK_API_THROTTLE_COUNT=250 \
    ZENDESK_API_THROTTLE_SECONDS=60 \
    ZENDESK_API_CHUNK_DATE_SECONDS=86400 \
    ZENDESK_FIELD_AMOUNT_TO_REFUND=amountToRefund,360000048369 \
    ZENDESK_FIELD_CARRIER_TRACKING_ID=carrierTrackingNumber,28291032 \
    ZENDESK_FIELD_CUBYN_RESOLUTION=cubynResolution,25301895 \
    ZENDESK_FIELD_CUBYN_STATUS=cubynStatus,45370545 \
    ZENDESK_FIELD_CUBYN_TRACKING_NUMBER=cubynTrackingNumber,360000074545 \
    ZENDESK_FIELD_INSURANCE=insurance,45311609 \
    ZENDESK_FIELD_INSURANCE_CLAIM=insuranceClaim,360000050769 \
    ZENDESK_FIELD_RECIPIENT=recipient,28541541 \
    ZENDESK_FIELD_REFUND_ANNOUNCED_DATE=refundAnnouncedDate,360000048925 \
    ZENDESK_FIELD_REFUND_TO_CREATE=refundToCreate,360000048905 \
    ZENDESK_FIELD_REFUND_TYPE=refundType,360000073665 \
    ZENDESK_FIELD_REFUND_STATUS=refundStatus,360000117229 \
    ZENDESK_FIELD_REQUEST_TYPE=requestType,360000111605 \
    ZENDESK_FIELD_RESPONSIBILITY=responsibility,360000074545 \
    ZENDESK_FIELD_SHIPPING_FEES_REFUND=shippingFeesRefund,360000051065 \
    ZENDESK_FIELD_SHIPPING_PROVIDER=shippingProvider,25252095 \
    ZENDESK_FIELD_SHIPPING_PROVIDER_INQUIRY_NUMBER=shippingProviderInquiryNumber,25520775 \
    ZENDESK_FIELD_SHIPPING_PROVIDER_INQUIRY_STATUS=shippingProviderInquiryStatus,25441809 \
    ZENDESK_FIELD_TICKET_CREATED_BY=ticketCreatedBy,25790859 \
    TRUSTPILOT_API_BASE_URL=https://api.trustpilot.com \
    TRUSTPILOT_BUSINESS_UNIT_ID=5c9b57429bfecb0001ed659c \
    TRUSTPILOT_INVITATIONS_API_BASE_URL=https://invitations-api.trustpilot.com \
    TRUSTPILOT_INVITATION_REPLY_TO_EMAIL=hello@cubyn.com \
    TRUSTPILOT_INVITATION_SENDER_NAME=Cubyn \
    TRUSTPILOT_INVITATION_SENDER_EMAIL=noreply.invitations@trustpilotmail.com \
    TRUSTPILOT_INVITATION_DEFAULT_LANGUAGE=FR \
    TRUSTPILOT_INVITATION_DEFAULT_LOCALE=fr-FR \
    TRUSTPILOT_INVITATION_ENGLISH_TEMPLATE_ID=613a1d43703205d0df65fe03 \
    TRUSTPILOT_INVITATION_FRENCH_TEMPLATE_ID=616044402d23b5a0941c1208 \
    TRUSTPILOT_INVITATION_SPANISH_TEMPLATE_ID=613a38683b27ba36445b38eb \
    TRUSTPILOT_INVITATION_DEFAULT_TEMPLATE_ID=616044402d23b5a0941c1208 \
    TRUSTPILOT_INVITATION_REDIRECT_URI=http://trustpilot.com/ \
    TRUSTPILOT_TOKENS_HOST_ID=1 \
    TRUSTPILOT_TODO_DELAY=172800000 \
    TRUSTPILOT_FAILED_MAX_RETRIES=3 \
    TRUSTPILOT_PROCESS_BULK_SIZE=50 \
    TRUSTPILOT_SHIPPER_BLACKLIST="" \
    BANK_REFUND_LIST_SEND_TO_FR=fr_financehead@cubyn.com \
    BANK_REFUND_LIST_SEND_TO_ES=es_financehead@cubyn.com \
    BANK_REFUND_LIST_ORG_NAME="CUBYN" \
    BANK_REFUND_LIST_ORG_FR_CTRY="FR" \
    BANK_REFUND_LIST_ORG_FR_IBAN="FR7630004008220001043764566" \
    BANK_REFUND_LIST_ORG_FR_BIC="BNPAFRPPXXX" \
    BANK_REFUND_LIST_ORG_ES_CTRY="FR" \
    BANK_REFUND_LIST_ORG_ES_IBAN="FR7630004008220001043764566" \
    BANK_REFUND_LIST_ORG_ES_BIC="BNPAFRPPXXX" \
    BANK_REFUND_LIST_ORG_CHARGE_BEARER="SLEV" \
    BANK_REFUND_LIST_ORG_PAYMENT_METHOD="TRF" \
    BANK_REFUND_LIST_ORG_SERVICE_LEVEL="SEPA"

CMD ["make", "run"]
