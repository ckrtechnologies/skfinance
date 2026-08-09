import re

with open('/Users/chandanmallik/projects/skfinance/dealer/src/screens/WalletScreen.js', 'r') as f:
    content = f.read()

# Replace all `<Tabs.Content value="ledger" mt="$3">` with `{activeTab === 'ledger' && (`
content = re.sub(r'<Tabs\.Content value="([a-zA-Z]+)" mt="\$3">', r'{activeTab === "\1" && (', content)

# Replace all `</Tabs.Content>` with `)}`
content = re.sub(r'</Tabs\.Content>', r')}', content)

# Remove `</Tabs>`
content = re.sub(r'</Tabs>', '', content)

with open('/Users/chandanmallik/projects/skfinance/dealer/src/screens/WalletScreen.js', 'w') as f:
    f.write(content)
