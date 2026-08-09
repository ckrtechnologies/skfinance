import re

with open('/Users/chandanmallik/projects/skfinance/dealer/src/screens/DashboardScreen.js', 'r') as f:
    content = f.read()

# Replace the Card section with a clean TouchableOpacity that acts as a Card
replacement = """                  <View key={banner.id} style={{ width: width, paddingHorizontal: 16 }}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={{
                        width: width - 32,
                        height: 180,
                        backgroundColor: 'white',
                        borderRadius: 16,
                        overflow: 'hidden',
                        elevation: 4,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <Image 
                        source={{ uri: processImageUrl(banner.image_url) }} 
                        style={{ width: '100%', height: '100%' }} 
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  </View>"""

# Use regex to replace the specific block inside `banners.map`
# Find `<View key={banner.id} style={{ width: width, paddingHorizontal: 16 }}>`
# up to `</View>` closing it.
pattern = r'<View key=\{banner\.id\} style=\{\{ width: width, paddingHorizontal: 16 \}\}>.*?<\/View>'
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('/Users/chandanmallik/projects/skfinance/dealer/src/screens/DashboardScreen.js', 'w') as f:
    f.write(content)

