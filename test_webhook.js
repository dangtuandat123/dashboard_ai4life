
async function testWebhook() {
    try {
        const response = await fetch('https://chatgpt.id.vn/webhook/bb17371c-6a34-421e-b659-75aa42041122', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'hello' })
        });
        const text = await response.text();
        console.log('---RAW RESPONSE START---');
        console.log(text);
        console.log('---RAW RESPONSE END---');
    } catch (error) {
        console.error('Error:', error);
    }
}

testWebhook();
