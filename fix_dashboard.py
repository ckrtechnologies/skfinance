import re

with open('/Users/chandanmallik/projects/skfinance/dealer/src/screens/DashboardScreen.js', 'r') as f:
    content = f.read()

# Replace Weekly Volume Chart
replacement1 = """          {/* Weekly Volume Real-time Bar Chart */}
          <Card elevate size="$3" bordered p="$4" mt="$2" backgroundColor="$background">
            <H4 fontWeight="bold" mb="$4">Weekly Application Volume</H4>
            <XStack ai="center" jc="center" style={{ overflow: 'hidden' }}>
              <BarChart
                data={volumeData}
                barWidth={14}
                spacing={Math.max(4, (width - 178) / 6)}
                initialSpacing={10}
                noOfSections={3}
                barBorderRadius={4}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor="$borderColor"
                yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#6b7280', fontSize: 10, fontWeight: '600', textAlign: 'center' }}
                yAxisLabelWidth={30}
                hideRules
                height={140}
                width={width - 40}
                disableScroll={true}
              />
            </XStack>
          </Card>"""

# Replace Vehicle Category Breakdown
replacement2 = """          {/* Vehicle Category Bar Chart (New Car / Used Car / Commercial) */}
          <Card elevate size="$3" bordered p="$4" mt="$2" backgroundColor="$background">
            <H4 fontWeight="bold" mb="$4">Vehicle Category Breakdown</H4>
            <XStack ai="center" jc="center" style={{ overflow: 'hidden' }}>
              <BarChart
                data={categoryData}
                barWidth={28}
                spacing={Math.max(10, (width - 184) / 2)}
                initialSpacing={20}
                noOfSections={3}
                barBorderRadius={4}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor="$borderColor"
                yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#6b7280', fontSize: 10, fontWeight: '600', textAlign: 'center' }}
                yAxisLabelWidth={30}
                hideRules
                height={140}
                width={width - 40}
                disableScroll={true}
              />
            </XStack>
          </Card>"""

content = re.sub(r'          \{\/\* Weekly Volume Real-time Bar Chart \*\/\}.*?<\/Card>', replacement1, content, flags=re.DOTALL)
content = re.sub(r'          \{\/\* Vehicle Category Bar Chart \(New Car \/ Used Car \/ Commercial\) \*\/\}.*?<\/Card>', replacement2, content, flags=re.DOTALL)

with open('/Users/chandanmallik/projects/skfinance/dealer/src/screens/DashboardScreen.js', 'w') as f:
    f.write(content)
