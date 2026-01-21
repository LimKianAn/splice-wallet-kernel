// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    Key,
    Transaction,
    SignTransactionParams,
    GetTransactionParams,
    GetTransactionsParams,
    CreateKeyParams,
    Tx,
    TxHash,
    KeyIdentifier,
    InternalTxId,
    PublicKey,
} from '@canton-network/core-signing-lib'

/**
 * A TypeScript SDK client for the Wallet Signing API.
 */
export class SigningAPIClient {
    private baseUrl: string
    private apiKey: string | undefined
    private masterKey: string
    private testNetwork: boolean

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
        this.masterKey = 'Default'
        this.testNetwork = true
    }

    private async post<I extends Record<string, unknown>, O>(
        endpoint: string,
        params: I,
        authToken?: string
    ): Promise<O> {
        const url = `${this.baseUrl}${endpoint}`

        const bodyToSend = {
            ...params,
            masterKey: this.masterKey,
            testNetwork: this.testNetwork,
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }

        const token = authToken ?? this.apiKey
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(bodyToSend),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(
                `API call to ${endpoint} failed (${response.status}): ${errorText}`
            )
        }

        // Handle 204 No Content for methods that return empty objects or null/void
        if (
            response.status === 204 ||
            response.headers.get('content-length') === '0'
        ) {
            // SetConfiguration/GetConfiguration return map[string]any which might be empty
            return {} as O
        }

        return response.json() as Promise<O>
    }

    public async signTransaction(
        params: SignTransactionParams,
        authToken?: string
    ): Promise<Transaction> {
        return this.post<BlockDaemonSignTransactionParams, Transaction>(
            '/signTransaction',
            {
                publicKey: params.keyIdentifier.publicKey!,
                ...params,
            },
            authToken
        )
    }

    public async getTransaction(
        params: GetTransactionParams,
        authToken?: string
    ): Promise<Transaction> {
        return this.post<GetTransactionParams, Transaction>(
            '/getTransaction',
            params,
            authToken
        )
    }

    public async getTransactions(
        params: GetTransactionsParams,
        authToken?: string
    ): Promise<Transaction[]> {
        return this.post<GetTransactionsParams, Transaction[]>(
            '/getTransactions',
            params,
            authToken
        )
    }

    public async getKeys(authToken?: string): Promise<Key[]> {
        return this.post<Record<string, never>, Key[]>(
            '/getKeys',
            {},
            authToken
        )
    }

    public async createKey(
        params: CreateKeyParams,
        authToken?: string
    ): Promise<Key> {
        return this.post<CreateKeyParams, Key>('/createKey', params, authToken)
    }

    /**
     * Get configuration parameters (client-side only).
     * Returns the current BaseURL, ApiKey, MasterKey, and TestNetwork settings.
     */
    public getConfiguration(): Record<string, unknown> {
        return {
            BaseURL: this.baseUrl,
            ApiKey: this.apiKey,
            MasterKey: this.masterKey,
            TestNetwork: this.testNetwork,
        }
    }

    /**
     * Set configuration parameters (client-side only).
     * Updates only the provided configuration fields.
     * @param params - Configuration parameters to set. All fields are optional.
     */
    public setConfiguration(params: {
        BaseURL?: string
        ApiKey?: string
        MasterKey?: string
        TestNetwork?: boolean
    }): Record<string, unknown> {
        if (params.BaseURL !== undefined) {
            this.baseUrl = params.BaseURL.endsWith('/')
                ? params.BaseURL.slice(0, -1)
                : params.BaseURL
        }
        if (params.ApiKey !== undefined) {
            this.apiKey = params.ApiKey
        }
        if (params.MasterKey !== undefined) {
            this.masterKey = params.MasterKey
        }
        if (params.TestNetwork !== undefined) {
            this.testNetwork = params.TestNetwork
        }
        return this.getConfiguration()
    }
}

//todo: remove once blockdaemon supports keyIdentifier instead of publicKey
interface BlockDaemonSignTransactionParams {
    tx: Tx
    txHash: TxHash
    publicKey: PublicKey
    keyIdentifier: KeyIdentifier
    internalTxId?: InternalTxId
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    [k: string]: any
}
