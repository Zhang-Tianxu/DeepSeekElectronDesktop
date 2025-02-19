/*
// Need to use the React-specific entry point to import createApi
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Define a service using a base URL and expected endpoints
export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
  endpoints: (builder) => ({
    getPokemonByName: builder.query({
      query: (name) => `pokemon/${name}`,
    }),
    getStream: builder.query({
      query: () => 'stream-endpoint', // 实际 URL（可选，SSE 可能不需要）
      async onCacheEntryAdded(
        _arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        // 创建 EventSource 连接
        const es = new EventSource('http://127.0.0.1:8000/');

        try {
          await cacheDataLoaded; // 等待缓存条目初始化

          es.onmessage = (event) => {
            updateCachedData((draft) => {
              draft.push(event.data); // 更新缓存数据
            });
          };

        } catch (error) {
          // 处理错误
        }

        // 当缓存条目被移除时关闭连接
        await cacheEntryRemoved;
        es.close();
      },
    }),
  }),
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const { useGetStreamQuery, useGetPokemonByNameQuery } = chatApi
*/