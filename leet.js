let a= [1,2,2,3,4]


freq ={}
for (val of a){
    freq[val]=(freq[val]||0)+1
}

console.log(freq)