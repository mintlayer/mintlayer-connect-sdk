export const seed_phrase = process.env.TEST_SEED_PHRASE || 'test';

export const addresses: any = {
  "mainnet": {},
  "testnet": {
    "receiving": [
      "tmt1q9874wgx6enm2mzfu0yxhzleu84pp00l95l7er5z",
    ],
    "change": [
      "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
    ]
  }
};

export const utxos: any = [
  {
    "outpoint": {
      "index": 0,
      "source_id": "2e15c6af4443bd9039343f0d21926746bc35a9737c99ca970fe72e11264bd23f",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1q9874wgx6enm2mzfu0yxhzleu84pp00l95l7er5z",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "1",
          "decimal": "1"
        },
        "token_id": "tmltk1wy7fqxu0qavm5ts66w5exytmxgsgdd66q266c93glu5m3f7hzjsq046gmy",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "126237854a2f69e61760932de09fc41b1bfd1ee18af6725010c73767e1c34037",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1q9l0g4kd3s6x5rmesaznegz06pw9hxu6qvqu3pa7",
      "lock": {
        "content": 7200,
        "type": "ForBlockCount"
      },
      "type": "LockThenTransfer",
      "value": {
        "amount": {
          "atoms": "981900000000",
          "decimal": "9.819"
        },
        "type": "Coin"
      }
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "d964a60d19d5b8c95e45c303867b097bedd257b2b3da72a3a12efa16ec7683b0",
      "source_type": "Transaction"
    },
    "utxo": {
      "htlc": {
        "refund_key": "tmt1qxjkxwfcv7cscypmxhugss6jjzxh6c6k7u48acjf",
        "refund_timelock": {
          "content": 20,
          "type": "ForBlockCount"
        },
        "secret_hash": {
          "hex": "73d01e927b39d3d4150c59751d493379537c6810",
          "string": null
        },
        "spend_key": "tmt1q9l0g4kd3s6x5rmesaznegz06pw9hxu6qvqu3pa7"
      },
      "type": "Htlc",
      "value": {
        "amount": {
          "atoms": "1000000000000",
          "decimal": "10"
        },
        "type": "Coin"
      }
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "5e753c87c602e0dca468c89f04be603e0cc50341ee72e6f79efcdde04ddb9990",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qxf50ffxunjw557a9zf2et0vywkwjszyxyppa0py",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "100",
          "decimal": "1"
        },
        "token_id": "tmltk1une5v627lk0cln0y4g8cxxvk62rye9qaqp97h2m5r5puljyqzgrqrq5530",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 1,
      "source_id": "a3a822f5e9099075e07234f435a2cda80cb6e88836331238b882da785973d7ac",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qxf50ffxunjw557a9zf2et0vywkwjszyxyppa0py",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "1000000000000",
          "decimal": "10"
        },
        "token_id": "tmltk17jgtcm3gc8fne3su8s96gwj0yw8k2khx3fglfe8mz72jhygemgnqm57l7l",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "cdcee4a44823978cc50245eff518a562c4461e74fee2ce2f46cade822f657e0d",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qyjlh9w9t7qwx7cawlqz6rqwapflsvm3dulgmxyx",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "100000000000",
          "decimal": "1000"
        },
        "token_id": "tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "bc4c1b1fbd7bada628fb14448de63205ee15c25c32553a80c7d816b92161a034",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1q9q4gk90m5wmcjphvrnvefc750pfx0cagqwxwwxl",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "1000000000",
          "decimal": "10"
        },
        "token_id": "tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "c10dffb5df5e1f1c745d8a79eee7828b50655565a993ff49777f9475b63b0667",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1q9q4gk90m5wmcjphvrnvefc750pfx0cagqwxwwxl",
      "lock": {
        "content": 100,
        "type": "ForBlockCount"
      },
      "type": "LockThenTransfer",
      "value": {
        "amount": {
          "atoms": "1000000000",
          "decimal": "10"
        },
        "token_id": "tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 2,
      "source_id": "c10dffb5df5e1f1c745d8a79eee7828b50655565a993ff49777f9475b63b0667",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1q9q4gk90m5wmcjphvrnvefc750pfx0cagqwxwwxl",
      "lock": {
        "content": 200,
        "type": "ForBlockCount"
      },
      "type": "LockThenTransfer",
      "value": {
        "amount": {
          "atoms": "1000000000",
          "decimal": "10"
        },
        "token_id": "tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "c2ae4bef077c284136ae5a7da4cefc4ba5591e6c5ce64f4a007763ec2d8f2b6f",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1q9q4gk90m5wmcjphvrnvefc750pfx0cagqwxwwxl",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "1000000000",
          "decimal": "10"
        },
        "token_id": "tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "5a6752ae5d4da45c9f163d0f1b24aed13e3fda88b11742469b202b37f7b9e38f",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "1000000000000",
          "decimal": "10"
        },
        "type": "Coin"
      }
    }
  },
  {
    "outpoint": {
      "index": 1,
      "source_id": "5a6752ae5d4da45c9f163d0f1b24aed13e3fda88b11742469b202b37f7b9e38f",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "865500000000",
          "decimal": "8.655"
        },
        "type": "Coin"
      }
    }
  },
  {
    "outpoint": {
      "index": 1,
      "source_id": "6af09ce349bc3eda6c14f019257d0b39ac99c6f74c57eebdd8999e3a039c3768",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "1687021711700428",
          "decimal": "16870.21711700428"
        },
        "type": "Coin"
      }
    }
  },
  {
    "outpoint": {
      "index": 2,
      "source_id": "92b08778d6d0345f1f943f83e7969fbcece9629938dddcec94f0b28382a58feb",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "98990000000000000",
          "decimal": "989900"
        },
        "token_id": "tmltk17jgtcm3gc8fne3su8s96gwj0yw8k2khx3fglfe8mz72jhygemgnqm57l7l",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "a8cddf098fc5e9a36951f2aade7aa23fddf96fb5afe87c1589ce1a7c022a8e6e",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "1000000000000",
          "decimal": "10"
        },
        "type": "Coin"
      }
    }
  },
  {
    "outpoint": {
      "index": 1,
      "source_id": "a8cddf098fc5e9a36951f2aade7aa23fddf96fb5afe87c1589ce1a7c022a8e6e",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "765500000000",
          "decimal": "7.655"
        },
        "type": "Coin"
      }
    }
  },
  {
    "outpoint": {
      "index": 1,
      "source_id": "c3a3ab2d96ce705fafa499d0858ae6fc512f78b1c6319413e731a0051203e077",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "99500000000",
          "decimal": "995"
        },
        "token_id": "tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 1,
      "source_id": "d964a60d19d5b8c95e45c303867b097bedd257b2b3da72a3a12efa16ec7683b0",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "1687068004300000",
          "decimal": "16870.680043"
        },
        "type": "Coin"
      }
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "6eed78dd553ea0125a54fb95b960217d3509aeeb2ec80196d5d21aefa4487d01",
      "source_type": "Transaction"
    },
    "utxo": {
      "data": {
        "additional_metadata_uri": {
          "hex": "697066733a2f2f6261666b726569656d6861676332736e706a6a6e64766471346a786d68346c6f6267336d707465327a3432627269657164336d6564677367633471",
          "string": "ipfs://bafkreiemhagc2snpjjndvdq4jxmh4lobg3mpte2z42brieqd3medgsgc4q"
        },
        "creator": null,
        "description": {
          "hex": "4465736372697074696f6e",
          "string": "Description"
        },
        "icon_uri": {
          "hex": "697066733a2f2f62616679626569627732796c363432336561673433746c6765757074636564726632666c78706e707674796d736e71627063666e6c786a637a34692f70686f746f5f323032342d31302d30332d32332e32342e30342e6a706567",
          "string": "ipfs://bafybeibw2yl6423eag43tlgeuptcedrf2flxpnpvtymsnqbpcfnlxjcz4i/photo_2024-10-03-23.24.04.jpeg"
        },
        "media_hash": {
          "hex": "010006000906000401000002",
          "string": "\u0001\u0000\u0006\u0000\t\u0006\u0000\u0004\u0001\u0000\u0000\u0002"
        },
        "media_uri": {
          "hex": "697066733a2f2f62616679626569627732796c363432336561673433746c6765757074636564726632666c78706e707674796d736e71627063666e6c786a637a34692f70686f746f5f323032342d31302d30332d32332e32342e30342e6a706567",
          "string": "ipfs://bafybeibw2yl6423eag43tlgeuptcedrf2flxpnpvtymsnqbpcfnlxjcz4i/photo_2024-10-03-23.24.04.jpeg"
        },
        "name": {
          "hex": "4e616d65",
          "string": "Name"
        },
        "ticker": {
          "hex": "505050",
          "string": "PPP"
        }
      },
      "destination": "tmt1q96glhddzd2u9wcyzfeqm53yrxxqgfm66yezu0gd",
      "token_id": "tmltk1hulyp284e3kc522ta435wyckrqy4j4842perueyge6ctjlp2mpds65mcx8",
      "type": "IssueNft"
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "9dc1221aa78551c7529068c021531df59103226d8b46277cd2ab40c6f78455ef",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1q96glhddzd2u9wcyzfeqm53yrxxqgfm66yezu0gd",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "1000000000000",
          "decimal": "10"
        },
        "type": "Coin"
      }
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "0da4ad912602b87fe0ae40691ddc075e6e3cdd1891724456ab9a44490dc3f69b",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qy9l2pvaz84z60uvlggcy5ttxdvw825uhsxeaxc5",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "10000000000000",
          "decimal": "100"
        },
        "token_id": "tmltk16u754a6su60wd3tra669a3gt0su79zehqeavu4ffgrnjzgaedasqtfurcu",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "0b9844f148f6ce71f0ec3741b9ed40ba1a709f1bdf2dc3144ff31d7b49c9be07",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1q8kfn6vl835y4tj5yfsdvz7ay5cjnvhv952wftmt",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "9000000000000",
          "decimal": "90"
        },
        "token_id": "tmltk17jgtcm3gc8fne3su8s96gwj0yw8k2khx3fglfe8mz72jhygemgnqm57l7l",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 1,
      "source_id": "c10dffb5df5e1f1c745d8a79eee7828b50655565a993ff49777f9475b63b0667",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1q9092r369lp4vl4glxdec7lu56s47uy96uydmmel",
      "lock": {
        "content": 100,
        "type": "ForBlockCount"
      },
      "type": "LockThenTransfer",
      "value": {
        "amount": {
          "atoms": "1000000000",
          "decimal": "10"
        },
        "token_id": "tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 3,
      "source_id": "c10dffb5df5e1f1c745d8a79eee7828b50655565a993ff49777f9475b63b0667",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1q9092r369lp4vl4glxdec7lu56s47uy96uydmmel",
      "lock": {
        "content": 200,
        "type": "ForBlockCount"
      },
      "type": "LockThenTransfer",
      "value": {
        "amount": {
          "atoms": "1000000000",
          "decimal": "10"
        },
        "token_id": "tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 1,
      "source_id": "c2ae4bef077c284136ae5a7da4cefc4ba5591e6c5ce64f4a007763ec2d8f2b6f",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1q9092r369lp4vl4glxdec7lu56s47uy96uydmmel",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "1000000000",
          "decimal": "10"
        },
        "token_id": "tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 2,
      "source_id": "3ac01a6e57a89b594857b1b9b9bd6a2e54bc0b52f01707a27e8440857c20ea71",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qylwcqnt5p0kajj6rnwa8fvrtqgf4jcvaun5h7h8",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "91400",
          "decimal": "914"
        },
        "token_id": "tmltk1une5v627lk0cln0y4g8cxxvk62rye9qaqp97h2m5r5puljyqzgrqrq5530",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 2,
      "source_id": "da4f9123aba44d1b717e73e184f06d01c7038cfd007cdb8f4891957c4008010d",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1q8z50vz0cq0a44wrskpdsy4juqjpf66wysd0h5yn",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "1744620000",
          "decimal": "17.4462"
        },
        "token_id": "tmltk1aa3vvztufv5m054klp960p6f6pf59ugxp394x7n42v0clgwhrw3q3mpcq3",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 1,
      "source_id": "d383642287fc39d1892d446c1fee58913eb84f0ac505c88c1de7efdd1c0d6ac9",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qyfqf403hv8yjmyn5lqt25hs28wzfqxce5xgaw8j",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "957100000000",
          "decimal": "9.571"
        },
        "type": "Coin"
      }
    }
  },
  {
    "outpoint": {
      "index": 2,
      "source_id": "ca1ce85c5ef7e987d098832a367562ecfa5c08b6c681e3af952017dbde4fbb53",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qx66ux2w4cjj3ctsu9469s7k7vde6xmhkq2my0h2",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "98",
          "decimal": "98"
        },
        "token_id": "tmltk1wvfgu57geuqrjzxmnk48jmnp5salnd0ggmcymxl6u3h6wk7smnjqjrr0u6",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 1,
      "source_id": "30c10ba376dac3c37ab0fa730be74c5c0d87126904a8e9ed214b114f2342a258",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1q8w4n0hvkk985zxf3alxv3qkucnzn7r6ev8vnmgh",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "411011008199784",
          "decimal": "4110.11008199784"
        },
        "type": "Coin"
      }
    }
  },
  {
    "outpoint": {
      "index": 2,
      "source_id": "fc2fc83d5931446b3b75406b747d93db516217fde5d9a7c9067140d0172a2a40",
      "source_type": "Transaction"
    },
    "utxo": {
      "destination": "tmt1qy2z74rsfcygs7v2rhuzt9usvpg35q24g54gq0p5",
      "type": "Transfer",
      "value": {
        "amount": {
          "atoms": "0",
          "decimal": "0"
        },
        "token_id": "tmltk1xvjg47rcn6j9afcpwzcv8rut5edys8yakgktrkjpzpw5ys83v4tqtqzrd4",
        "type": "TokenV1"
      }
    }
  },
  {
    "outpoint": {
      "index": 0,
      "source_id": "513932890fb1fee9b21d3004d4292e7eace8753f43d601013d635b8b1195f207",
      "source_type": "Transaction"
    },
    "utxo": {
      "htlc": {
        "refund_key": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
        "refund_timelock": {
          "content": 20,
          "type": "ForBlockCount"
        },
        "secret_hash": {
          "hex": "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3",
          "string": null
        },
        "spend_key": "tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc"
      },
      "type": "Htlc",
      "value": {
        "amount": {
          "atoms": "1000000000000",
          "decimal": "10"
        },
        "type": "Coin"
      }
    }
  }
]
