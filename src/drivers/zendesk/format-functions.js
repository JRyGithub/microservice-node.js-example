/* eslint-disable no-undefined */
function formatPrettyDate(date) {
  if (!date) {
    return 'NULL';
  }

  const exDate = new Date(date);
  // eslint-disable-next-line no-magic-numbers
  const exDay = `0${exDate.getDate()}`.slice(-2);
  // eslint-disable-next-line no-magic-numbers
  const exMonth = `0${exDate.getMonth() + 1}`.slice(-2);

  return `${exDay}/${exMonth}/${exDate.getFullYear()}`;
}

function formatISO8601ShortDate(stringDate) {
  const exDate = new Date(stringDate);
  // eslint-disable-next-line no-magic-numbers
  const exDay = `0${exDate.getDate()}`.slice(-2);
  // eslint-disable-next-line no-magic-numbers
  const exMonth = `0${exDate.getMonth() + 1}`.slice(-2);

  return `${exDate.getFullYear()}-${exMonth}-${exDay}`;
}

function formatOrderPID(id) {
  return `CUB${id}`;
}

function revertFormatOrderPID(id) {
  return id.includes('CUB') ? +id.replace('CUB', '') : id;
}

function revertPrettyInvoiceId(id) {
  return id.includes('TMP') ? +id.replace('TMP', '') : +id;
}

function stringify(object) {
  return JSON.stringify(object);
}

function getOrderRecipientName(parcel) {
  if (parcel.lastName && parcel.firstName) {
    if (parcel.organizationName) {
      return `${parcel.firstName} ${parcel.lastName} (${parcel.organizationName})`;
    }

    return `${parcel.firstName} ${parcel.lastName}`;
  }
  if (parcel.organizationName) {
    return `${parcel.organizationName}`;
  }

  return null;
}

function getParcelErrorType(validations) {
  if (validations.address && validations.address.status === 'FAILED') {
    return 'ADDRESS_ERROR';
  }
  if (validations.picklist && validations.picklist.error === 'STOCK_CHECK_FAILED') {
    return 'OUT_OF_STOCK';
  }
  if (validations.picklist && validations.picklist.error === 'VALIDATION_FAILED') {
    return 'UNKNOWN_SKU';
  }

  return null;
}

function getWioNotScannableCount(lines) {
  return lines.filter(({ barcode }) => barcode === 'ITEM_NOT_SCANNABLE').length;
}

function getWioLabelledCount(lines) {
  return lines
    .filter(({ barcode }) => barcode !== 'ITEM_NOT_SCANNABLE')
    .reduce((count, { quantityLabeled }) => count + quantityLabeled, 0);
}

function formatAddress(object) {
  const { firstName, lastName, line1, line2, additionalInformation, zip, city, country } = object;

  let lines = `${line1}`;

  if (lastName) {
    lines = `${lastName}, ${lines}`;
  }

  if (firstName) {
    lines = `${firstName} ${lines}`;
  }

  if (line2) {
    lines = `${lines} ${line2}`;
  }

  if (additionalInformation) {
    lines = `${lines} ${additionalInformation}`;
  }

  return `${lines}, ${zip} ${city}, ${country}`;
}

function isManuallyImported(via) {
  const settings = via.settings
    ? via.settings
    : { isAutoImportActivated: false, isNewVersion: false };

  if (
    !via.classId ||
    (via.classId === 1 && !settings.isAutoImportActivated) ||
    (via.classId === 2 && settings.isNewVersion && !settings.isAutoImportActivated)
  ) {
    return 'YES';
  }

  return 'NO';
}

function formatDeliveries(deliveries) {
  if (deliveries && deliveries.length > 0) {
    return stringify(
      deliveries.map((delivery) => ({
        deliveryId: delivery.id,
        carrier: delivery.carrierName,
        carrierTrackingID: delivery.carrierTrackingId,
        receivedAt: delivery.receivedAt ? formatISO8601ShortDate(delivery.receivedAt) : undefined,
        containersDeclared: delivery.declaredPackingUnits,
        containersReceived: delivery.receivedPackingUnits,
        estimatedDeliveryDate: delivery.estimatedReceptionDate
          ? formatISO8601ShortDate(delivery.estimatedReceptionDate)
          : undefined,
        itemsReceived: delivery.storedItems
      }))
    );
  }

  return '';
}

module.exports = {
  formatPrettyDate,
  formatISO8601ShortDate,
  getOrderRecipientName,
  stringify,
  getParcelErrorType,
  formatOrderPID,
  revertFormatOrderPID,
  revertPrettyInvoiceId,
  getWioNotScannableCount,
  getWioLabelledCount,
  formatAddress,
  isManuallyImported,
  formatDeliveries
};
