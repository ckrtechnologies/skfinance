import re

with open('/Users/chandanmallik/projects/skfinance/dealer/src/screens/ApplicationsScreen.js', 'r') as f:
    content = f.read()

# Remove the small plus button
btn_pattern = r"""\s*<Button\s+backgroundColor=\{colors\.brandGreen\}\s+pressStyle=\{\{ backgroundColor: colors\.brandGreenDark \}\}\s+color="white"\s+size="\$3"\s+icon=\{Plus\}\s+circular\s+onPress=\{\(\) => navigation\.navigate\('NewApplication'\)\}\s+\/>"""
content = re.sub(btn_pattern, '', content)

# Find the end of the return statement to insert the FAB
# It usually ends with `</YStack>\n    </SafeAreaView>`
fab_code = """
      <TouchableOpacity
        onPress={() => navigation.navigate('NewApplication')}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.brandGreen,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
          zIndex: 999
        }}
      >
        <Plus color="white" size={28} />
      </TouchableOpacity>
    </SafeAreaView>"""

content = content.replace('    </SafeAreaView>', fab_code)

with open('/Users/chandanmallik/projects/skfinance/dealer/src/screens/ApplicationsScreen.js', 'w') as f:
    f.write(content)
