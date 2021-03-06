import { request } from 'graphql-request'

import * as settings from "api/settings";
import * as blockchain from "api/blockchain";
import { fromWei, toChecksumAddress, toBytes32 } from "utils/helpers";

// export const calculateLiquidationPrice = (par, per, mat, skr, dai) => {
//   return wdiv(wmul(wmul(dai, par), mat), wmul(skr, per));
// }
//
// export const calculateRatio = (tag, par, skr, dai) => {
//   return wdiv(wmul(skr, tag).round(0), wmul(dai, par));
// }

// export const tab = (cup, chi) => {
//   return wmul(cup.art, chi).round(0);
// }
//
// export const rap = (cup, rhi, chi) => {
//   return wmul(cup.ire, rhi).minus(tab(cup, chi)).round(0);
// }

export const getCup = id => {
  return new Promise((resolve, reject) => {
    blockchain.objects.saiValuesAggregator.aggregateCDPValues(toBytes32(id), (e, cup) => {
      if (!e) {
        const cupData = {
          id: parseInt(id, 10),
          lad: cup[1],
          safe: cup[2],
          ink: cup[3][0],
          art: cup[3][1],
          ire: cup[3][2],
          ratio: fromWei(cup[3][3]),
          avail_dai: cup[3][4],
          avail_skr: cup[3][5],
          avail_eth: cup[3][6],
          liq_price: cup[3][7]
        };
        resolve({block: cup[0].toNumber(), id: cupData.id, cupData });
      } else {
        reject(e);
      }
    });
  });
}

export const getFromService = (network, query) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", settings.chain[network].service, true);
    xhr.setRequestHeader("Content-type", "application/graphql");
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve(response);
      } else if (xhr.readyState === 4 && xhr.status !== 200) {
        reject(xhr.status);
      }
    }
    // xhr.send();
    xhr.send(`query ${query}`);
  });
}

export const getCupsFromService = (network, lad) => {
  return new Promise((resolve, reject) => {
    getFromService(network, `{ allCups( condition: { lad: "${toChecksumAddress(lad)}" } ) { nodes { id, block } } }`)
    .then(r => resolve(r.data.allCups.nodes), e => reject(e))
  });
}

export function fetchCups(account) {
  const getCupsQuery = `
    query AllCups($lad: String!) {
      allCups(
        first: 50,
        condition: {
          deleted: false
        },
        filter: {
          lad: {
            in: [$lad]
          }
        },
        orderBy: RATIO_ASC
      ) {
        totalCount
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
        }
        nodes {
          id
          lad
          art
          ink
          ratio
          actions(first: 5) {
            nodes {
              act
              time
            }
          }
        }
      }
    }
  `
  const URL = settings.chain['kovan'].service
  const params = {
    lad: account
  }

  return request(URL, getCupsQuery, params)
    .then(data => data.allCups.nodes)
    .then(data => (
      data.map(node => {
        // Mark difference between CDP's belonging to an account or a proxy
        node.isLegacy = node.lad === params.lad ? true : false
        return node
      })
    ))
}


export const getCupHistoryFromService = (network, cupId) => {
  return new Promise((resolve, reject) => {
    getFromService(network, `{ getCup(id: ${cupId}) { actions { nodes { act arg guy tx time ink art per pip } } } }`)
    .then(r => resolve(r.data.getCup ? r.data.getCup.actions.nodes : null), e => reject(e))
  });
}

export const getContracts = (proxyRegistry, address) => {
  return new Promise((resolve, reject) => {
    blockchain.objects.saiValuesAggregator.getContractsAddrs(proxyRegistry, address, (e, r) => {
      if (!e) {
        resolve(r);
      } else {
        reject(e);
      }
    });
  });
}

export const getAggregatedValues = (account, proxy) => {
  return new Promise((resolve, reject) => {
    blockchain.objects.saiValuesAggregator.aggregateValues.call(account, proxy, { from: "0x0000000000000000000000000000000000000000" }, (e, r) => {
      if (!e) {
        resolve(r);
      } else {
        reject(e);
      }
    });
  });
}
