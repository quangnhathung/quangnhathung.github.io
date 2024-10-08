// Function to create process input fields
function generateProcessInput() {
    const processCount = document.getElementById('processCount').value;
    let inputHtml = `<table><tr><th>Process</th><th>Arrival Time</th><th>Burst Time</th></tr>`;
    
    for (let i = 0; i < processCount; i++) {
        inputHtml += `
            <tr>
                <td>P${i + 1}</td>
                <td><input type="number" id="arrivalTime${i}" min="0" required></td>
                <td><input type="number" id="burstTime${i}" min="1" required></td>
            </tr>`;
    }
    inputHtml += `</table>`;
    document.getElementById('processInputSection').innerHTML = inputHtml;
}

// Function to run the Round Robin scheduling algorithm
function runRoundRobin() {
    const processCount = document.getElementById('processCount').value;
    const timeQuantum = parseInt(document.getElementById('timeQuantum').value);

    let processes = [];
    for (let i = 0; i < processCount; i++) {
        const arrivalTime = parseInt(document.getElementById(`arrivalTime${i}`).value);
        const burstTime = parseInt(document.getElementById(`burstTime${i}`).value);
        processes.push({
            name: `P${i + 1}`,
            arrivalTime: arrivalTime,
            burstTime: burstTime,
            remainingTime: burstTime,
            waitingTime: 0,
            completionTime: 0
        });
    }

    // sắp xếp theo thời gian đến
    processes.sort((a, b) => a.arrivalTime - b.arrivalTime);

    // Round Robin
    let currentTime = 0;
    let completed = 0;
    let queue = [];
    let ganttChart = [];
    queue.push(processes[0]); // đưa vào hàng đơi
    let index = 1;

    while (completed < processCount) {
        if (queue.length > 0) {
            let currentProcess = queue.shift();

            let executionTime = Math.min(currentProcess.remainingTime, timeQuantum);
            currentTime = Math.max(currentTime, currentProcess.arrivalTime);
            ganttChart.push({ process: currentProcess.name, start: currentTime, end: currentTime + executionTime });
            currentProcess.remainingTime -= executionTime;
            currentTime += executionTime;

            while (index < processCount && processes[index].arrivalTime < currentTime) {
                queue.push(processes[index]);
                index++;
            }

            if (currentProcess.remainingTime > 0) {
                queue.push(currentProcess);
            } else {
                completed++;
                currentProcess.waitingTime = currentTime - currentProcess.arrivalTime - currentProcess.burstTime;
                currentProcess.completionTime = currentTime - currentProcess.arrivalTime;
            }
        } else {
            currentTime++;
        }
    }

    // Output the result table
    let resultHtml = `<table><tr><th>Process</th><th>Arrival Time</th><th>Burst Time</th><th>Waiting Time</th><th>Completion Time</th></tr>`;
    processes.forEach(process => {
        resultHtml += `<tr>
            <td>${process.name}</td>
            <td>${process.arrivalTime}</td>
            <td>${process.burstTime}</td>
            <td>${process.waitingTime}</td>
            <td>${process.completionTime}</td>
        </tr>`;
    });
    resultHtml += `</table>`;
    document.getElementById('resultTable').innerHTML = resultHtml;
    let avgtime = 0;
    let cnt=0;
    processes.forEach(process => {
        cnt++;
        avgtime+=process.waitingTime;
    });
    avgtime= avgtime/cnt;
    document.getElementById('Time').innerHTML = avgtime.toFixed(3);
    //má vcl thiệt
    let ganttHtml = '';
    ganttChart.forEach(block => {
      let space = "";
      let i=1; 
      while (i <= (block.end - block.start)){
        let y=i;
        space += "&nbsp;&nbsp;&nbsp;"
        i++;
      } 
       //${block.start}  ${str}  ${block.process}  str  ${block.end}
        ganttHtml += `<div class="gantt-block"> ${block.start}${space}${block.process}${space}${block.end} </div>`;
    });
    document.getElementById('ganttChart').innerHTML = ganttHtml;
}
