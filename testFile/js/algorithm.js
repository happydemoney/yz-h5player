/**
 * 数学算法相关
 */

/**
 * @param: n (Number)
 * @description: 判断一个数字是否为质数
 * @returns: true / false
 */
function isPrime(n) {
    if (n <= 3) { return n > 1; }
    if (n % 2 == 0 || n % 3 == 0) { return false; }

    for (var i = 5; i * i <= n; i += 6) {
        if (n % i == 0 || n % (i + 2) == 0) { return false; }
    }
    return true;
}

/**
 * @param: n(Number)
 * @description: 是否为奇数
 * @returns: true / false
 */
function isOdd(n) {
    if (n % 2 > 0) {
        return true;
    }
    return false;
}

/**
 * @param: n1(Number) , n2(Number)
 * @description: 判断两个数字的 互质关系
 * @returns: true / false
 */
function coprime(n1, n2) {
    // 1. 任意两个质数构成互质关系，比如13和61。
    if (isPrime(n1) && isPrime(n2)) {
        return true;
    }
    //　2. 一个数是质数，另一个数只要不是前者的倍数，两者就构成互质关系，比如3和10。
    if ((isPrime(n1) && n2 % n1 > 0) || (isPrime(n2) && n1 % n2 > 0)) {
        return true;
    }
    //　3. 如果两个数之中，较大的那个数是质数，则两者构成互质关系，比如97和57。
    if ((isPrime(n2) && n2 > n1 > 0) || (isPrime(n1) && n1 > n2 > 0)) {
        return true;
    }
    //　4. 1和任意一个自然数是都是互质关系，比如1和99。
    if (n1 === 1 || n2 === 1) {
        return true;
    }
    //　5. p是大于1的整数，则p和p - 1构成互质关系，比如57和56。
    if ((n1 - n2 === 1 && n2 > 1) || (n2 - n1 === 1 && n1 > 1)) {
        return true;
    }
    //　6. p是大于1的奇数，则p和p - 2构成互质关系，比如17和15。
    if ((n1 > 1 && isOdd(n1) && n1 - n2 === 2) || n2 > 1 && isOdd(n2) && n2 - n1 === 2) {
        return true;
    }
    return false;
}
console.log(coprime(13, 61), coprime(97, 57), coprime(3, 10), coprime(1, 99), coprime(57, 56), coprime(15, 17));
/**
 * @param: n(Number)
 * @description: 任意给定正整数n，请问在小于等于n的正整数之中，有多少个与n构成互质关系？（比如，在1到8之中，有多少个数与8构成互质关系？）
 * @returns: num
 */
function euler(n) {
    // 如果n=1，则 φ(1) = 1 。因为1与任何数（包括自身）都构成互质关系。
    if (n === 1) {
        return 1;
    }
    // 如果n是质数，则 φ(n)=n-1 。因为质数与小于它的每一个数，都构成互质关系。比如5与1、2、3、4都构成互质关系。
    if (isPrime(n)) {
        return n - 1;
    }
}