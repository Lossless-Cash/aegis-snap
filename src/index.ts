import type {
  OnRpcRequestHandler,
  OnTransactionHandler,
} from '@metamask/snaps-sdk';
import { divider, row, panel, text, heading } from '@metamask/snaps-sdk';

import { chainToIdMapping, getRiskScoreEmoji } from './utils';

const API_URL = 'https://aegis-api.lossless.io/graphql';

const setAegisApiKey = async (apiKey: string) => {
  await snap.request({
    method: 'snap_manageState',
    params: {
      operation: 'update',
      newState: {
        aegisApiKey: apiKey,
      },
    },
  });
};
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  const persistedData = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  });

  switch (request.method) {
    case 'setAegisApiKey':
      if (
        request.params &&
        'apiKey' in request.params &&
        typeof request.params.apiKey === 'string'
      ) {
        setAegisApiKey(request.params.apiKey);
        return snap.request({
          method: 'snap_dialog',
          params: {
            type: 'alert',
            content: panel([
              text('Aegis API key set successfully!'),
              text('You can now use the Aegis Snap to view address analysis.'),
            ]),
          },
        });
      }

    case 'getAegisApiKey':
      if (
        persistedData &&
        persistedData.hasOwnProperty('aegisApiKey') &&
        persistedData.aegisApiKey
      ) {
        return {
          apiKey: persistedData.aegisApiKey,
        };
      }
      return {
        apiKey: null,
      };

    default:
      throw new Error('Method not found.');
  }
};

export const onTransaction: OnTransactionHandler = async ({
  transaction,
  chainId,
}) => {
  const persistedData = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  });

  if (
    persistedData == null ||
    !persistedData.hasOwnProperty('aegisApiKey') ||
    persistedData.aegisApiKey == null
  ) {
    return {
      content: panel([
        heading('No API Key'),
        text(
          'Please Visit [aegis.lossless.io](https://aegis.lossless.io/snap) to sync your API key ',
        ),
      ]),
    };
  }

  let displayContent = [];

  const toAddress = transaction.to;
  const chainIdTx = chainId.split(':')[1];
  const chainName = chainToIdMapping[Number(chainIdTx)];
  if (!chainName) {
    return {
      content: panel([
        heading('Aegis Snap'),
        text(`Chain ID ${chainIdTx} is not supported by Aegis Snap`),
      ]),
    };
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
      query RunContractAnalysis($address: String!, $chain: String!, $apiKey: String!) {
        snapContractAnalysis(address: $address, chain: $chain, apiKey: $apiKey) {
          riskScore
            general {
                isVerified
            }
            privellegedAddresses {
                type
                address
            }
            integratedContracts {
                contractType
                contractAddress
                tokenName
            }
        }
    }
      `,
      variables: {
        address: toAddress,
        chain: chainName,
        apiKey: persistedData.aegisApiKey.toString(),
      },
    }),
  });

  const apiData = await response.json();

  if (apiData.errors) {
    const errorMessage = apiData.errors[0].message;

    if (errorMessage === 'ADDRESS_NOT_A_CONTRACT') {
      return {
        content: panel([
          heading('Aegis Snap'),
          text('The address provided is not a contract address.'),
        ]),
      };
    }

    return {
      content: panel([
        heading('Aegis Snap'),
        text(`An error occurred: ${errorMessage}`),
      ]),
    };
  }

  if (apiData.data.snapContractAnalysis !== null) {
    const riskEmoji = getRiskScoreEmoji(
      apiData.data.snapContractAnalysis.riskScore,
    );

    displayContent = [
      heading('Aegis Analysis Review'),
      divider(),
      text(''),
      row(
        'Risk Score:',
        text(
          `**${apiData.data.snapContractAnalysis.riskScore.toString()} ${riskEmoji}**`,
        ),
      ),
      row(
        'Is Verified:',
        text(
          `**${
            apiData.data.snapContractAnalysis.general.isVerified ? 'Yes' : 'No'
          }**`,
        ),
      ),

      divider(),
    ];

    if (apiData.data.snapContractAnalysis.privellegedAddresses.length !== 0) {
      displayContent.push(heading('Privelledged Addresses'));
      displayContent.push(divider());
      for (const address of apiData.data.snapContractAnalysis
        .privellegedAddresses) {
        displayContent.push(
          row('Type:', text(`**${address.type}**`)),
          row('Address:', text(`**${address.address}**`)),
        );
      }
      displayContent.push(divider());
    }

    if (apiData.data.snapContractAnalysis.integratedContracts.length !== 0) {
      displayContent.push(heading('Integrated Contracts'));
      displayContent.push(divider());
      for (const contract of apiData.data.snapContractAnalysis
        .integratedContracts) {
        displayContent.push(
          row('Contract Type:', text(`**${contract.contractType}**`)),
          row('Contract Address:', text(`**${contract.contractAddress}**`)),
        );
        if (contract.tokenName) {
          displayContent.push(
            row('Token Name:', text(`**${contract.tokenName}**`)),
          );
        }
        displayContent.push(divider());
      }
    }

    displayContent.push(divider());
    displayContent.push(
      row('Analyzed At:', text(`**${new Date().toLocaleString()}**`)),
    );

    displayContent.push(divider());
    displayContent.push(text('**Analyzed by Lossless Aegis**'));
    displayContent.push(
      text(
        '*Analysis data is based on proprietary software by the Lossless Aegis team. This should not be treated as full on contract audit.*',
      ),
    );
    return {
      content: panel(displayContent),
    };
  }

  return {
    content: panel([
      heading('Aegis Snap'),
      text('No is available for this contract'),
    ]),
  };
};
