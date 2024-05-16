
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

const PORT = process.env.PORT ?? 3008

import { Client, GatewayIntentBits } from 'discord.js'
import dotenv from 'dotenv'

dotenv.config()

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
    ]
})

client.login(process.env.DISCORD_TOKEN)



const discordFlow = addKeyword('website').addAnswer(
    ['Puedes ver nuestro sitio web acá', '🤓 https://owlbytech.com \n', 'Deseas ponerte en contácto con uno de nuestro equipo? *si*'].join(
        '\n'
    ),
    { capture: true },
    async (ctx, { gotoFlow, flowDynamic }) => {
        if (ctx.body.toLocaleLowerCase().includes('si')) {
            return gotoFlow(registerFlow)
        }
        await flowDynamic('Thanks!')
        return
    }
)

const welcomeFlow = addKeyword(['hi', 'hello', 'hola'])
    .addAnswer(`Hola, estás hablando con owlbybot`).addAnswer(`Beep beep boop`, {
        media: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2dqdHN6bm44ejd2cTViaTlpbjVva2xiZ2tpdzNncmx5NjdsajZueCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26n6FUWBkefh0nv6E/giphy.gif',
    })
    .addAnswer(
        [
            '¿Quieres saber más de owlbytech?',
            'Escribe *website*',
        ].join('\n'),
        { delay: 800, capture: true },
        async (ctx, { fallBack }) => {
            if (!ctx.body.toLocaleLowerCase().includes('website')) {
                return fallBack('Tienes que escribir *website*')
            }
            return
        },
        [discordFlow]
    )

const registerFlow = addKeyword(utils.setEvent('REGISTER_FLOW'))
    .addAnswer(`¿Cuál es tu nombre?`, { capture: true }, async (ctx, { state }) => {
        await state.update({ name: ctx.body })
    }).addAnswer('Cuéntanos tu idea', { capture: true }, async (ctx, { state }) => {
        await state.update({ idea: ctx.body })
    })
    .addAction(async (_, { flowDynamic, state }) => {
        const name = state.get('name');
        const idea = state.get('idea');
        
        const channelId = process.env.CHANNEL_ID 
        const channel = await client.channels.fetch(channelId);
        if (channel?.isTextBased()) {
            channel.send(`Un cliente escribio al whatsapp acerca de una idea \n\n**Nombre:** ${name}\n**Idea:** ${idea}`);
          }
        await flowDynamic(`${state.get('name')}, gracias por tu información! nos pondremos pronto en contácto`)
    })


const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, registerFlow])

    const adapterProvider = createProvider(Provider)
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    httpServer(+PORT)
}

main()
