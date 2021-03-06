const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js');
 
const WIDTH = 7;
const HEIGHT = 6;
const gameBoard = [];
const reactions = { "1️⃣": 1, "2️⃣": 2, "3️⃣": 3, "4️⃣": 4, "5️⃣": 5, "6️⃣": 6, "7️⃣": 7 }

module.exports = class Connect4Game {
    constructor(options = {}) {
        if (!options.message) throw new TypeError('NO_MESSAGE: Lütfen bir mesaj argümanı sağlayın')
        if (typeof options.message !== 'object') throw new TypeError('INVALID_MESSAGE: Geçersiz Discord Mesajı nesnesi sağlandı.')

        if(!options.opponent) throw new TypeError('NO_OPPONENT: Lütfen bir rakip argümanı sağlayın')
        if (typeof options.opponent !== 'object') throw new TypeError('INVALID_OPPONENT: Geçersiz Discord Kullanıcı nesnesi sağlandı.')
        
        if (!options.embed) options.embed = {};
        if (!options.embed.title) options.embed.title = 'Connect 4';
        if (typeof options.embed.title !== 'string')  throw new TypeError('INVALID_TITLE: Yerleştirme Başlığı bir dize olmalıdır.')

        if (!options.embed.color) options.embed.color = '#5865F2';
        if (typeof options.embed.color !== 'string')  throw new TypeError('INVALID_COLOR: Embed Color bir dize olmalıdır.')
        
        if (!options.emojis) options.emojis = {};
        if (!options.emojis.player1) options.emojis.player1 = '🔵';
        if (typeof options.emojis.player1 !== 'string')  throw new TypeError('INVALID_EMOJI: Player1 Emoji bir dize olmalıdır.')

        if (!options.emojis.player2) options.emojis.player2 = '🟡';
        if (typeof options.emojis.player2 !== 'string')  throw new TypeError('INVALID_EMOJI: Player2 Emoji bir dize olmalıdır.')

        if (!options.askMessage) options.askMessage = 'Merhaba {opponent}, {challenger} size Connect 4 oyunu için meydan okudu!';
        if (typeof options.askMessage !== 'string')  throw new TypeError('ASK_MESSAGE: Ask Mesajı bir dize olmalıdır.')

        if (!options.cancelMessage) options.cancelMessage = 'Görünüşe göre Connect4 oyunu oynamayı reddetmişler. \:(';
        if (typeof options.cancelMessage !== 'string')  throw new TypeError('CANCEL_MESSAGE: İptal Mesajı bir dize olmalıdır.')

        if (!options.timeEndMessage) options.timeEndMessage = 'Rakip cevap vermeyince oyunu bıraktım!';
        if (typeof options.timeEndMessage !== 'string')  throw new TypeError('TIME_END_MESSAGE: Zaman Bitiş Mesajı bir dize olmalıdır.')

        if (!options.turnMessage) options.turnMessage = '{emoji} | Şimdi sıra **{player}**!';
        if (typeof options.turnMessage !== 'string')  throw new TypeError('TURN_MESSAGE: Dönüş Mesajı bir dize olmalıdır.')      

        if (!options.gameEndMessage) options.gameEndMessage = 'Oyun bitmedi :(';
        if (typeof options.gameEndMessage !== 'string')  throw new TypeError('GAME_END_MESSAGE: Oyun Bitiş Mesajı bir dize olmalıdır.')
        if (!options.winMessage) options.winMessage = '{emoji} | **{winner}** oyunu kazandı!';
        if (typeof options.winMessage !== 'string')  throw new TypeError('WIN_MESSAGE: Win Mesajı bir dize olmalıdır.')
        if (!options.drawMessage) options.drawMessage = 'O bir çizimdi!';
        if (typeof options.drawMessage !== 'string')  throw new TypeError('DRAW_MESSAGE: Draw Mesajı bir dize olmalıdır.')
        if (!options.othersMessage) options.othersMessage = 'Bu mesaj için butonları kullanmanıza izin verilmiyor!';
        if (typeof options.othersMessage !== 'string') throw new TypeError('INVALID_OTHERS_MESSAGE: Diğerleri Mesaj bir dize olmalıdır.')


        this.message = options.message;
        this.opponent = options.opponent;
        this.emojis = options.emojis;
        this.options = options;
        this.gameEmbed = null;
        this.inGame = false;
        this.redTurn = true;
        // red => author, yellow => opponent

    }

    getGameBoard() {
        let str = "";
        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                str += "" + gameBoard[y * WIDTH + x];
            }
            str += "\n";
        }
        str += "1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣"
        return str;
    
    }

    async startGame() {
        if (this.inGame) return;
        const author = this.message.author;
        const opponent = this.opponent;
        const emoji = this.options.emoji ? this.options.emoji : '';

        if (opponent.bot) return this.message.channel.send(`**${emoji} Botlarla oynayamazsın!**`)
        if (opponent.id === author.id) return this.message.channel.send(`**${emoji} Kendinle oynayamazsın!**`)

        const embed = new MessageEmbed()
        .setTitle(this.options.embed.title)
        .setDescription(this.options.askMessage
            .replace('{challenger}', '<@!' + this.message.author.id + '>')
            .replace('{opponent}', '<@!' + this.opponent.id + '>'))
        .setColor(this.options.green || this.options.embed.color)

        let btn1 = new MessageButton().setLabel('Kabul et').setStyle('SUCCESS').setCustomId('accept')
        let btn2 = new MessageButton().setLabel('Reddet').setStyle('DANGER').setCustomId('reject')
        let row = new MessageActionRow().addComponents(btn1, btn2);
        const askMsg = await this.message.channel.send({ embeds: [embed], components: [row] });
        

        const filter = (interaction) => interaction === interaction;
        const interaction = askMsg.createMessageComponentCollector({
            filter, time: 60000
        })

        interaction.on('collect', async (btn) => {
            if (btn.user.id !== this.opponent.id) {
                return btn.reply({ content: this.options.othersMessage,  ephemeral: true })
            }
            
            await btn.deferUpdate();
            if (btn.customId === 'reject') {
                for (let y = 0; y < askMsg.components[0].components.length; y++) {
                  askMsg.components[0].components[y].disabled = true;
                }
    
                if (this.options.red) askMsg.embeds[0].color = this.options.red;
                askMsg.embeds[0].description = this.options.cancelMessage.replace('{opponent}', '<@!' + this.opponent.id + '>').replace('{challenger}', '<@!' + this.message.author.id + '>')
                return askMsg.edit({ embeds: askMsg.embeds, components: askMsg.components });
    
            } else if (btn.customId === 'accept') {
                askMsg.delete().catch();
                for (let y = 0; y < HEIGHT; y++) {
                    for (let x = 0; x < WIDTH; x++) {
                        gameBoard[y * WIDTH + x] = "⚪";
                    }
                }
                this.inGame = true;
        
                this.message.channel.send({ embeds: [this.GameEmbed()] }).then(msg => {
                    this.gameEmbed = msg;
                    Object.keys(reactions).forEach(reaction => {
                        this.gameEmbed.react(reaction);
                    });
        
                    this.checkReactions();
                });        
            }
        });

        interaction.on('end', (c, r) => {
            if (r !== 'time') return;
            for (let y = 0; y < askMsg.components[0].components.length; y++) {
              askMsg.components[0].components[y].disabled = true;
            }

            if (this.options.red) askMsg.embeds[0].color = this.options.red;
            askMsg.embeds[0].description = this.options.timeEndMessage.replace('{opponent}', '<@!' + this.opponent.id + '>').replace('{challenger}', '<@!' + this.message.author.id + '>');
            return askMsg.edit({ embeds: askMsg.embeds, components: askMsg.components });
        });
    }
    
    GameEmbed() {
        const status = this.options.turnMessage.replace('{emoji}', this.getChip()).replace('{player}', this.redTurn ? this.message.author.username : this.opponent.username)

        return new MessageEmbed() 
        .setColor(this.options.embed.color)
        .setTitle(this.options.embed.title)
        .setDescription(this.getGameBoard())
        .addField('Durum', status)
        .setFooter(`${this.message.author.username} vs ${this.opponent.username}`, this.message.guild.iconURL({ dynamic: true }))
    } 


    gameOver(result) {
        this.inGame = false;

        const editEmbed = new MessageEmbed()
        .setColor(this.options.embed.color)
        .setTitle(this.options.embed.title)
        .setDescription(this.getGameBoard())
        .addField('Durum', this.getResultText(result))
        .setFooter(`${this.message.author.username} vs ${this.opponent.username}`, this.message.guild.iconURL({ dynamic: true }))
        
        this.gameEmbed.edit({ embeds: [editEmbed] });
        this.gameEmbed.reactions.removeAll();
    }

    
    checkReactions() {
        const filter = (reaction, user) => Object.keys(reactions).includes(reaction.emoji.name) && user.id === this.message.author.id || user.id === this.opponent.id;

        this.gameEmbed.awaitReactions({ filter, max: 1, time: 120000, errors: ['time'] })
        .then(async collected => {
            const reaction = collected.first();
            const user = reaction.users.cache.filter(user => user.id !== this.gameEmbed.author.id).first();
            
            // Get the turn of the user.
            const turn = this.redTurn ? this.message.author.id : this.opponent.id;

            if (user.id !== turn) {
                reaction.users.remove(user.id)
                return this.checkReactions();
            }
            
            const column = reactions[reaction.emoji.name] - 1;
            let placedX = -1;
            let placedY = -1;

            for (let y = HEIGHT - 1; y >= 0; y--) {
                const chip = gameBoard[column + (y * WIDTH)];
                if (chip === "⚪") {
                    gameBoard[column + (y * WIDTH)] = this.getChip();
                    placedX = column;
                    placedY = y;
                    break;
                }
            }

            reaction.users.remove(user.id).then(() => {
                if (placedY == 0)
                    this.gameEmbed.reactions.cache.get(reaction.emoji.name).remove();

                if (this.hasWon(placedX, placedY)) {
                    this.gameOver({ result: 'winner', name: user.username, emoji: this.getChip() });
                }
                else if (this.isBoardFull()) {
                    this.gameOver({ result: 'tie' });
                }
                else {
                    this.redTurn = !this.redTurn;
                    this.gameEmbed.edit({ embeds: [this.GameEmbed()] });
                    this.checkReactions();
                }
            });
        })
        .catch(collected => {
            console.log(collected)
            this.gameOver({ result: 'timeout' });
        });

    }


    hasWon(placedX, placedY) {
        const chip = this.getChip();

        //Horizontal Check
        const y = placedY * WIDTH;
        for (var i = Math.max(0, placedX - 3); i <= placedX; i++) {
            var adj = i + y;
            if (i + 3 < WIDTH) {
                if (gameBoard[adj] === chip && gameBoard[adj + 1] === chip && gameBoard[adj + 2] === chip && gameBoard[adj + 3] === chip)
                    return true;
            }
        }
        //Verticle Check
        for (var i = Math.max(0, placedY - 3); i <= placedY; i++) {
            var adj = placedX + (i * WIDTH);
            if (i + 3 < HEIGHT) {
                if (gameBoard[adj] === chip && gameBoard[adj + WIDTH] === chip && gameBoard[adj + (2 * WIDTH)] === chip && gameBoard[adj + (3 * WIDTH)] === chip)
                    return true;
            }
        }
        //Ascending Diag
        for (var i = -3; i <= 0; i++) {
            var adjX = placedX + i;
            var adjY = placedY + i;
            var adj = adjX + (adjY * WIDTH);
            if (adjX + 3 < WIDTH && adjY + 3 < HEIGHT) {
                if (gameBoard[adj] === chip && gameBoard[adj + WIDTH + 1] === chip && gameBoard[adj + (2 * WIDTH) + 2] === chip && gameBoard[adj + (3 * WIDTH) + 3] === chip)
                    return true;
            }
        }
        //Descending Diag
        for (var i = -3; i <= 0; i++) {
            var adjX = placedX + i;
            var adjY = placedY - i;
            var adj = adjX + (adjY * WIDTH);
            if (adjX + 3 < WIDTH && adjY - 3 >= 0) {
                if (gameBoard[adj] === chip && gameBoard[adj - WIDTH + 1] === chip && gameBoard[adj - (2 * WIDTH) + 2] === chip && gameBoard[adj - (3 * WIDTH) + 3] === chip)
                    return true;
            }
        }
        return false;
    }

    getChip() {
        return this.redTurn ? this.emojis.player1 : this.emojis.player2;
    }

    isBoardFull() {
        for (let y = 0; y < HEIGHT; y++)
            for (let x = 0; x < WIDTH; x++)
                if (gameBoard[y * WIDTH + x] === "⚪")
                    return false;
        return true;
    }

    getResultText(result) {
        if (result.result === 'tie')
            return this.options.drawMessage;
        else if (result.result === 'timeout')
            return this.options.gameEndMessage;
        else if (result.result === 'error')
            return 'HATA: ' + result.error;
        else
            return this.options.winMessage.replace('{emoji}', result.emoji).replace('{winner}', result.name);
    }
}    
