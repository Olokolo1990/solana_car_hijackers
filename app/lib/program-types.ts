/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/vehicle_history.json`.
 */
export type VehicleHistory = {
  "address": "HkbccHJ45V7zbgLkwr64EUzRhfjdH1mcoQ5UVMAte341",
  "metadata": {
    "name": "vehicleHistory",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Solana program: NFT-based vehicle history passport"
  },
  "instructions": [
    {
      "name": "initialize",
      "docs": [
        "One-time program initialization. Sets up the GlobalConfig PDA and the",
        "admin authority that may register/revoke other authorities."
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "globalConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "mintVehiclePassport",
      "docs": [
        "Manufacturer-only: mint the passport NFT for a brand new vehicle at",
        "the factory. Records VIN hash + factory metadata on-chain."
      ],
      "discriminator": [
        60,
        113,
        227,
        161,
        103,
        113,
        98,
        8
      ],
      "accounts": [
        {
          "name": "manufacturerSigner",
          "docs": [
            "Manufacturer's signing wallet. Must match a registered Authority of",
            "kind = Manufacturer."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "manufacturerSigner"
              }
            ]
          }
        },
        {
          "name": "vehicle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  104,
                  105,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "vinHash"
              }
            ]
          }
        },
        {
          "name": "globalConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "mintPlaceholder"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "vinHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "make",
          "type": "string"
        },
        {
          "name": "model",
          "type": "string"
        },
        {
          "name": "year",
          "type": "u16"
        },
        {
          "name": "colorCode",
          "type": "u32"
        },
        {
          "name": "equipmentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "registerAuthority",
      "docs": [
        "Admin-only: register a new institutional authority."
      ],
      "discriminator": [
        142,
        245,
        45,
        213,
        198,
        12,
        231,
        91
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "newAuthoritySigner"
        },
        {
          "name": "globalConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "newAuthoritySigner"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "kind",
          "type": "u8"
        },
        {
          "name": "countryCode",
          "type": {
            "array": [
              "u8",
              2
            ]
          }
        },
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "revokeAuthority",
      "docs": [
        "Admin-only: revoke an existing authority. Past events written by it",
        "remain on-chain (immutability is a feature) but are flagged in UI."
      ],
      "discriminator": [
        233,
        254,
        239,
        15,
        49,
        183,
        105,
        21
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority.signer",
                "account": "authority"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "transferOwnership",
      "docs": [
        "Authority-only (registration office): record an ownership transfer.",
        "Personal data stays off-chain; only hashes go on-chain."
      ],
      "discriminator": [
        65,
        177,
        215,
        73,
        53,
        45,
        99,
        47
      ],
      "accounts": [
        {
          "name": "authoritySigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authoritySigner"
              }
            ]
          }
        },
        {
          "name": "vehicle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  104,
                  105,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "vehicle.vin_hash",
                "account": "vehicle"
              }
            ]
          }
        },
        {
          "name": "event",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  118,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vehicle"
              },
              {
                "kind": "account",
                "path": "vehicle.event_count",
                "account": "vehicle"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "prevOwnerHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "newOwnerHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "timestamp",
          "type": "i64"
        }
      ]
    },
    {
      "name": "writeEvent",
      "docs": [
        "Authority-only: append an event to a vehicle's history. Enforces",
        "anti-rollback on mileage at the protocol level."
      ],
      "discriminator": [
        49,
        209,
        172,
        95,
        225,
        160,
        178,
        94
      ],
      "accounts": [
        {
          "name": "authoritySigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authoritySigner"
              }
            ]
          }
        },
        {
          "name": "vehicle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  104,
                  105,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "vehicle.vin_hash",
                "account": "vehicle"
              }
            ]
          }
        },
        {
          "name": "event",
          "docs": [
            "New event PDA, seeded by vehicle + monotonic counter."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  118,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vehicle"
              },
              {
                "kind": "account",
                "path": "vehicle.event_count",
                "account": "vehicle"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "eventType",
          "type": "u8"
        },
        {
          "name": "timestamp",
          "type": "i64"
        },
        {
          "name": "mileageKm",
          "type": "u32"
        },
        {
          "name": "docArweaveTx",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "payloadHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "authority",
      "discriminator": [
        36,
        108,
        254,
        18,
        167,
        144,
        27,
        36
      ]
    },
    {
      "name": "globalConfig",
      "discriminator": [
        149,
        8,
        156,
        202,
        160,
        252,
        176,
        217
      ]
    },
    {
      "name": "vehicle",
      "discriminator": [
        162,
        43,
        29,
        9,
        73,
        6,
        44,
        15
      ]
    },
    {
      "name": "vehicleEvent",
      "discriminator": [
        42,
        229,
        239,
        117,
        93,
        247,
        109,
        35
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "mileageRollback",
      "msg": "Mileage cannot be lower than the last recorded value"
    },
    {
      "code": 6001,
      "name": "authorityRevoked",
      "msg": "Authority is not active"
    },
    {
      "code": 6002,
      "name": "authorityKindNotAllowed",
      "msg": "Authority kind is not allowed to write this event type"
    },
    {
      "code": 6003,
      "name": "notAdmin",
      "msg": "Only the admin can perform this action"
    },
    {
      "code": 6004,
      "name": "notManufacturer",
      "msg": "Only a manufacturer can mint a new passport"
    },
    {
      "code": 6005,
      "name": "notRegistrationOffice",
      "msg": "Only a registration office can transfer ownership"
    },
    {
      "code": 6006,
      "name": "vehicleAlreadyRegistered",
      "msg": "Vehicle has already been registered for this VIN"
    },
    {
      "code": 6007,
      "name": "stringTooLong",
      "msg": "String input exceeds maximum allowed length"
    },
    {
      "code": 6008,
      "name": "unknownEventType",
      "msg": "Event type is not recognized"
    }
  ],
  "types": [
    {
      "name": "authority",
      "docs": [
        "One per institutional writer (police, SKP, insurer, etc.)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "signer",
            "type": "pubkey"
          },
          {
            "name": "kind",
            "type": "u8"
          },
          {
            "name": "countryCode",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "eventsWritten",
            "type": "u64"
          },
          {
            "name": "registeredAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "globalConfig",
      "docs": [
        "Singleton config: stores admin pubkey and global counters."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "vehicleCount",
            "type": "u64"
          },
          {
            "name": "authorityCount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vehicle",
      "docs": [
        "One per VIN. Acts as the on-chain side of the NFT passport."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vinHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "manufacturer",
            "type": "pubkey"
          },
          {
            "name": "make",
            "type": "string"
          },
          {
            "name": "model",
            "type": "string"
          },
          {
            "name": "year",
            "type": "u16"
          },
          {
            "name": "colorCode",
            "type": "u32"
          },
          {
            "name": "equipmentHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "lastMileage",
            "type": "u32"
          },
          {
            "name": "eventCount",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vehicleEvent",
      "docs": [
        "One per appended event. v1 stores events as separate accounts; v2 will",
        "migrate to Metaplex Bubblegum compressed leaves to reduce rent costs."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vehicle",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "eventType",
            "type": "u8"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "mileageKm",
            "type": "u32"
          },
          {
            "name": "docArweaveTx",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "payloadHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "sequence",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "authoritySeed",
      "type": "bytes",
      "value": "[97, 117, 116, 104, 111, 114, 105, 116, 121]"
    },
    {
      "name": "eventSeed",
      "type": "bytes",
      "value": "[101, 118, 101, 110, 116]"
    },
    {
      "name": "globalConfigSeed",
      "type": "bytes",
      "value": "[103, 108, 111, 98, 97, 108, 95, 99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "maxMakeLen",
      "type": "u64",
      "value": "32"
    },
    {
      "name": "maxModelLen",
      "type": "u64",
      "value": "32"
    },
    {
      "name": "maxNameLen",
      "type": "u64",
      "value": "64"
    },
    {
      "name": "vehicleSeed",
      "type": "bytes",
      "value": "[118, 101, 104, 105, 99, 108, 101]"
    }
  ]
};
