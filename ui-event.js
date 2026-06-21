/* ==========================================================================

   👑 المحرك البرمجي المتكامل لمنصة KRIPTOCHAT ENTERPRISE (+18 VIP Edition)

   ========================================================================== */


const App = {

    state: {

        user: null,

        isRegistered: false,

        activeTab: 'stream',

        currentRoomId: 'premium_main_01',

        balance: 25000, 

        liveKitUrl: "wss://kriptoengine-live-y38qshsb.livekit.cloud",

        apiKey: "APIk2PJVTQ8JsGC"

    },


    // 1. متحكم الواجهات والعرض (UI)

    ui: {

        switchTab: function(tabName) {

            App.state.activeTab = tabName;

            console.log("🔄 تم الانتقال إلى تبويب:", tabName);

            document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

        },


        openModal: function(modalId) {

            const overlay = document.getElementById('modal-overlay');

            if (!overlay) return;

            overlay.style.display = 'flex';

            document.getElementById('gift-modal').style.display = 'none';

            document.getElementById('register-modal').style.display = 'none';

            

            const targetModal = document.getElementById(modalId);

            if (targetModal) targetModal.style.display = 'block';

        },


        closeModal: function() {

            const overlay = document.getElementById('modal-overlay');

            if (overlay) overlay.style.display = 'none';

        },


        appendChatMessage: function(sender, message, isPremium = false) {

            const chatMessagesContainer = document.getElementById('chat-messages');

            if (!chatMessagesContainer) return;


            const msgLine = document.createElement('div');

            msgLine.className = isPremium ? 'msg-line premium-gift' : 'msg-line';

            msgLine.innerHTML = `<strong>${sender}:</strong> ${message}`;

            chatMessagesContainer.appendChild(msgLine);

            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

        }

    },


    // 2. متحكم العمليات والمنطق (Logic)

    logic: {

        submitDetailedRegister: function(event) {

            event.preventDefault();

            const username = document.getElementById('reg-username').value.trim();

            const dobValue = document.getElementById('reg-dob').value;

            const gender = document.getElementById('reg-gender').value;

            const avatarInput = document.getElementById('reg-avatar');

            

            const checkedInterests = [];

            document.querySelectorAll('input[name="interest"]:checked').forEach(cb => {

                checkedInterests.push(cb.value);

            });


            if (!username || !dobValue || !gender) {

                alert("❌ من فضلك أكمل الحقول الإلزامية!");

                return;

            }


            const dob = new Date(dobValue);

            const today = new Date();

            let age = today.getFullYear() - dob.getFullYear();

            if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) {

                age--;

            }


            if (age < 18) {

                alert("🔞 عذراً! التطبيق مخصص للكبار فقط (+18).");

                return;

            }


            let avatarBase64 = "";

            if (avatarInput.files && avatarInput.files[0]) {

                const reader = new FileReader();

                reader.onload = function(e) {

                    avatarBase64 = e.target.result;

                    App.logic.finalizeUserSession(username, age, gender, checkedInterests, avatarBase64);

                };

                reader.readAsDataURL(avatarInput.files[0]);

            } else {

                App.logic.finalizeUserSession(username, age, gender, checkedInterests, "default_avatar");

            }

        },


        finalizeUserSession: function(username, age, gender, interests, avatar) {

            App.state.user = { username, age, gender, interests, avatar };

            App.state.isRegistered = true;

            

            App.ui.appendChatMessage("النظام ⚙️", `أهلاً بك ${username}! تم التحقق من السن (+18).`, true);

            App.ui.closeModal();


            App.livekit.fetchLiveKitToken(username, App.state.currentRoomId);

            App.network.sendUserSessionToServer(App.state.user);

        },


        sendGift: function(giftId, giftName, price) {

            if (!App.state.isRegistered) {

                alert("🔒 يرجى فتح حساب للتحقق من السن أولاً!");

                App.ui.openModal('register-modal');

                return;

            }


            if (App.state.balance < price) {

                alert(`❌ رصيدك غير كافٍ من توكن $SINU!`);

                return;

            }


            App.state.balance -= price;

            

            const giftPayload = {

                action: "send_gift",

                gift_id: giftId,

                gift_name: giftName,

                gift_price: price,

                user: App.state.user.username,

                room: App.state.currentRoomId

            };


            const isVipGift = price >= 500;

            App.ui.appendChatMessage(App.state.user.username, `أرسل هدية [${giftName}] بقيمة ${price} $SINU! ✨`, isVipGift);

            

            App.network.sendPayload(giftPayload);

            App.ui.closeModal();

        },


        sendMessageFromInput: function() {

            const input = document.getElementById('chat-msg-input');

            if (!input) return;


            const text = input.value.trim();

            if (!text) return;


            if (!App.state.isRegistered) {

                alert("🔒 يجب فتح حساب وتأكيد السن للدردشة!");

                App.ui.openModal('register-modal');

                return;

            }


            App.network.sendPayload({

                action: "send_message",

                sender: App.state.user.username,

                text: text,

                room: App.state.currentRoomId

            });


            App.ui.appendChatMessage("أنت 💬", text, false);

            input.value = "";

        },


        googleLogin: function() {

            alert("🌐 جاري الاتصال بـ Google Auth...");

        }

    },


    // 3. متحكم شبكة الـ LiveKit (WebRTC)

    livekit: {

        room: null,


        fetchLiveKitToken: function(username, roomName) {

            console.log(`📡 جاري طلب الـ Token للمستخدم ${username}...`);

            if (App.network.socket && App.network.socket.readyState === WebSocket.OPEN) {

                App.network.sendPayload({

                    action: "request_livekit_token",

                    username: username,

                    room: roomName,

                    apiKey: App.state.apiKey

                });

            } else {

                console.log("⚠️ السيرفر أوفلاين، تشغيل محاكي التذاكر الافتراضي.");

                setTimeout(() => {

                    this.connectToStream("mock_token_for_" + username);

                }, 1000);

            }

        },


        connectToStream: async function(token) {

            if (!token) return;

            try {

                console.log("🎬 جاري الاتصال بـ LiveKit...");

                this.room = new LivekitClient.Room({ adaptiveStream: true, dynacast: true });


                this.room.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {

                    if (track.kind === LivekitClient.Track.Kind.Video) {

                        const playerContainer = document.getElementById('player-container');

                        if (playerContainer) {

                            const placeholder = document.getElementById('video-placeholder');

                            if (placeholder) placeholder.style.display = 'none';


                            const videoElement = track.attach();

                            videoElement.style.width = "100%";

                            videoElement.style.height = "100%";

                            videoElement.style.objectFit = "cover";

                            playerContainer.appendChild(videoElement);

                        }

                    }

                });


                await this.room.connect(App.state.livekitUrl, token);

                App.ui.appendChatMessage("النظام ⚙️", "متصل بخادم الفيديو بنجاح فائق!", true);


            } catch (error) {

                console.error("❌ فشل ربط الفيديو:", error);

            }

        }

    },


    // 4. متحكم قنوات الاتصال والـ WebSocket مع الـ C++ (Network)

    network: {

        socket: null,

        

        init: function() {

            try {

                this.socket = new WebSocket("ws://localhost:8080");

                

                this.socket.onopen = () => {

                    console.log("🛰️ متصل بمحرك الـ C++ (Port 8080)");

                };


                this.socket.onmessage = async (event) => {

                    try {

                        const response = JSON.parse(event.data);

                        

                        if (response.action === "response_livekit_token" && response.token) {

                            await App.livekit.connectToStream(response.token);

                        }

                        if (response.action === "balance_update") {

                            App.state.balance = response.new_balance;

                        }

                        if (response.action === "broadcast_message") {

                            App.ui.appendChatMessage(response.sender, response.text, response.is_vip);

                        }

                    } catch (e) {

                        console.error("⚠️ خطأ في معالجة بيانات السيرفر:", e);

                    }

                };

            } catch (e) {

                console.log("⚠️ فشل الاتصال التلقائي بالـ WebSocket.");

            }

        },


        sendPayload: function(payload) {

            if (this.socket && this.socket.readyState === WebSocket.OPEN) {

                this.socket.send(JSON.stringify(payload));

            }

        },


        sendUserSessionToServer: function(userState) {

            this.sendPayload({ action: "register_user", data: userState });

        }

    }

};


// تشغيل الأحداث والروابط عند تحميل المستند بالكامل

document.addEventListener("DOMContentLoaded", () => {

    App.network.init();

    

    const giftBtn = document.getElementById('btn-gift');

    if (giftBtn) giftBtn.onclick = () => App.ui.openModal('gift-modal');


    const sendBtn = document.getElementById('send-msg-btn');

    if (sendBtn) sendBtn.onclick = () => App.logic.sendMessageFromInput();


    const inputField = document.getElementById('chat-msg-input');

    if (inputField) {

        inputField.addEventListener('keypress', (e) => {

            if (e.key === 'Enter') App.logic.sendMessageFromInput();

        });

    }

});

